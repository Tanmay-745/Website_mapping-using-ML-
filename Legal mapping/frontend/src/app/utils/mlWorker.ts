import { env, pipeline } from '@xenova/transformers';

// Skip local model check since we are running in the browser
// and want to fetch the model from the Hugging Face hub
env.allowLocalModels = false;
env.useBrowserCache = true;

// Default Target Columns exactly as they exist in the backend
export const defaultTargetColumns = [
    "name", "dpd", "total outstanding amt", "email", "phone num",
    "address", "lan", "office Address", "pincode", "language", "state",
    "loan amount", "regional manager", "regional manager phone number",
    "phone number", "mobile number", "agreement date", "city",
    "notice", "outstanding amount", "store", "collection manager",
    "collection manager phone number", "co-borrower"
];

// Helper to expand abbreviations like the backend
const abbreviationDict: Record<string, string> = {
    'rm': 'regional manager',
    'acm': 'collection manager',
    'lan': 'loan account number',
    'dpd': 'days past due',
    'amt': 'amount',
    'num': 'number',
    'no': 'number',
    'zip': 'pincode',
    'mobile/contact': 'phone number',
    'location': 'address'
};

function cleanAndExpandColumnName(colName: string): string {
    const rawStr = String(colName).toLowerCase().replace(/_/g, ' ').replace(/\//g, ' ');
    const words = rawStr.split(/\s+/);
    const expandedWords = words.map(word => abbreviationDict[word] || word);
    return expandedWords.join(' ');
}

class PipelineSingleton {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance: any = null;
    static targetColumns: string[] = [...defaultTargetColumns];
    static targetEmbeddings: any = null;
    static initializationPromise: Promise<void> | null = null;

    static async getInstance(progress_callback?: (data: any) => void) {
        if (this.instance === null && this.initializationPromise === null) {
            this.initializationPromise = (async () => {
                const pipe = await pipeline(this.task as any, this.model, { progress_callback });
                this.instance = pipe;

                // Pre-compute original target embeddings on initialization
                await this.updateTargets(this.targetColumns);
            })();
        }
        await this.initializationPromise;
        return this.instance;
    }

    static async updateTargets(newTargets: string[]) {
        if (!this.instance) return;
        this.targetColumns = [...newTargets];
        const cleanTargets = this.targetColumns.map(cleanAndExpandColumnName);
        const results = await this.instance(cleanTargets, { pooling: 'mean', normalize: true });
        this.targetEmbeddings = results;
    }
}

// Math helper for Cosine Similarity between two 1D arrays (tensors)
function cosineSimilarity(vecA: number[] | Float32Array, vecB: number[] | Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

self.addEventListener('message', async (event) => {
    const { action, payload } = event.data;

    switch (action) {
        case 'loadModel':
            try {
                // Initialize the model and compute target embeddings, sending progress back
                await PipelineSingleton.getInstance((x) => {
                    self.postMessage({ status: 'progress', data: x });
                });
                self.postMessage({ status: 'ready' });
            } catch (err: any) {
                self.postMessage({ status: 'error', error: err.message });
            }
            break;

        case 'mapColumns':
            try {
                const sourceColumns: string[] = payload.columns;
                const learnedMappings: Record<string, string> = payload.learnedMappings || {};

                // Ensure model is loaded 
                const pipe = await PipelineSingleton.getInstance();
                const targetEmbeddingsTensor = PipelineSingleton.targetEmbeddings;
                const currentTargets = PipelineSingleton.targetColumns;

                // Extract flat arrays from target tensor
                // The results tensor is shape [num_targets, embedding_dim]
                const targetCount = currentTargets.length;
                const embeddingDim = targetEmbeddingsTensor.dims[1];
                const targetVectors: Float32Array[] = [];
                for (let i = 0; i < targetCount; i++) {
                    const offset = i * embeddingDim;
                    targetVectors.push(targetEmbeddingsTensor.data.subarray(offset, offset + embeddingDim));
                }

                // Process learned mappings for transfer learning
                const validLearnedKeys = Object.keys(learnedMappings).filter(k => learnedMappings[k] && learnedMappings[k] !== '__SKIPPED__');
                let learnedTargetVectors: Float32Array[] = [];
                if (validLearnedKeys.length > 0) {
                    const learnedEmbeddingsResult = await pipe(validLearnedKeys.map(cleanAndExpandColumnName), { pooling: 'mean', normalize: true });
                    const learnedEmbeddingDim = learnedEmbeddingsResult.dims[1];
                    for (let i = 0; i < validLearnedKeys.length; i++) {
                        const offset = i * learnedEmbeddingDim;
                        learnedTargetVectors.push(learnedEmbeddingsResult.data.subarray(offset, offset + learnedEmbeddingDim));
                    }
                }

                const mappedResults = [];

                // Process each source column
                for (const col of sourceColumns) {
                    const cleanSource = cleanAndExpandColumnName(col);
                    // generate embedding 
                    const sourceResult = await pipe(cleanSource, { pooling: 'mean', normalize: true });
                    const sourceVector = sourceResult.data as Float32Array;

                    // compute similarities
                    let highestSimilarity = -1;
                    let predictedTarget = null;

                    for (let i = 0; i < targetCount; i++) {
                        let score = cosineSimilarity(sourceVector, targetVectors[i]);

                        // ID vs Name Bias:
                        // If source lacks 'id' but target has 'id', penalize
                        // If source lacks 'name' but target has 'name', boost
                        const sourceLower = cleanSource.toLowerCase();
                        const targetLower = currentTargets[i].toLowerCase();
                        if (!sourceLower.includes('id') && targetLower.includes('id')) {
                            score -= 0.05;
                        }
                        if (!sourceLower.includes('name') && targetLower.includes('name')) {
                            score += 0.05;
                        }

                        if (score > highestSimilarity) {
                            highestSimilarity = score;
                            predictedTarget = currentTargets[i];
                        }
                    }

                    // 2. Transfer Learning Matching
                    for (let i = 0; i < validLearnedKeys.length; i++) {
                        // Semantic comparison between new column and previously user-mapped column
                        let score = cosineSimilarity(sourceVector, learnedTargetVectors[i]);
                        
                        // Add a tiny boost to transfer learning to encourage sticking to user-taught precedents
                        score += 0.02;

                        if (score > highestSimilarity) {
                            highestSimilarity = score;
                            predictedTarget = learnedMappings[validLearnedKeys[i]];
                        }
                    }

                    mappedResults.push({
                        source_column: col,
                        predicted_target: predictedTarget,
                        confidence_score: Number(highestSimilarity.toFixed(2))
                    });
                }

                self.postMessage({
                    status: 'complete',
                    data: { mappings: mappedResults }
                });

            } catch (err: any) {
                self.postMessage({ status: 'error', error: err.message });
            }
            break;

        case 'updateTargets':
            try {
                const newTargets: string[] = payload.targets;
                await PipelineSingleton.getInstance(); // Ensure loaded
                await PipelineSingleton.updateTargets(newTargets);
                self.postMessage({ status: 'targets_updated', data: { targets: newTargets } });
            } catch (err: any) {
                self.postMessage({ status: 'error', error: err.message });
            }
            break;

        case 'mapToCustomTargets':
            try {
                const sourceColumns: string[] = payload.sources;
                const customTargets: string[] = payload.customTargets;

                const pipe = await PipelineSingleton.getInstance();

                // 1. Calculate embeddings for the specific custom targets
                const customTargetEmbeddingsResult = await pipe(customTargets.map(cleanAndExpandColumnName), { pooling: 'mean', normalize: true });
                const customTargetCount = customTargets.length;
                const embDim = customTargetEmbeddingsResult.dims[1];

                const customTargetVectors: Float32Array[] = [];
                for (let i = 0; i < customTargetCount; i++) {
                    const offset = i * embDim;
                    customTargetVectors.push(customTargetEmbeddingsResult.data.subarray(offset, offset + embDim));
                }

                const mappedCustomResults = [];

                // 2. Process each source column
                for (const col of sourceColumns) {
                    const cleanSource = cleanAndExpandColumnName(col);
                    const sourceResult = await pipe(cleanSource, { pooling: 'mean', normalize: true });
                    const sourceVector = sourceResult.data as Float32Array;

                    let bestMatchIndex = -1;
                    let highestSimilarity = -1;

                    for (let i = 0; i < customTargetCount; i++) {
                        let score = cosineSimilarity(sourceVector, customTargetVectors[i]);

                        const sourceLower = cleanSource.toLowerCase();
                        const targetLower = customTargets[i].toLowerCase();

                        if (!sourceLower.includes('id') && targetLower.includes('id')) {
                            score -= 0.05;
                        }
                        if (!sourceLower.includes('name') && targetLower.includes('name')) {
                            score += 0.05;
                        }

                        if (score > highestSimilarity) {
                            highestSimilarity = score;
                            bestMatchIndex = i;
                        }
                    }

                    mappedCustomResults.push({
                        source: col,
                        target: customTargets[bestMatchIndex],
                        confidence: Number(highestSimilarity.toFixed(2))
                    });
                }

                self.postMessage({
                    status: 'complete_custom',
                    data: { mappings: mappedCustomResults }
                });

            } catch (err: any) {
                self.postMessage({ status: 'error', error: err.message });
            }
            break;

        default:
            console.warn('Unknown action:', action);
    }
});
