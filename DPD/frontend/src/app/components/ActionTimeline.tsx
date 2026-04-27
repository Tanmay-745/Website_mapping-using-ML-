import {
  MessageSquare,
  Mail,
  Phone,
  FileText,
  Truck,
  Scale,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { AllocationData } from '../types';
import { useState } from 'react';

interface ActionTimelineProps {
  allocation: AllocationData;
  onSendNotification: (type: string) => Promise<void>;
}

interface TimelineAction {
  day: number;
  title: string;
  description: string;
  channels: string[];
  type: 'digital' | 'physical' | 'both';
  status: 'completed' | 'current' | 'pending';
  icon: React.ReactNode;
  notificationType: string;
}

export function ActionTimeline({ allocation, onSendNotification }: ActionTimelineProps) {
  const dpd = allocation.DPD;
  const isPaid = allocation.isPaid;
  const logs = allocation.logs || [];
  const [sending, setSending] = useState<string | null>(null);

  const isActionCompleted = (type: string) => {
    return logs.some(log => log.type === type && log.status === 'Sent');
  };

  const getActions = (): TimelineAction[] => {
    const actions: TimelineAction[] = [];

    // DPD 0-30
    if (dpd >= 0) {
      actions.push({
        day: 1,
        title: 'Days 1-15: Only Upload Reminder Notice',
        description: 'Upload and send reminder notices manually',
        channels: ['SMS', 'WhatsApp', 'Email'],
        type: 'digital',
        status: isActionCompleted('upload_reminder_0_15') ? 'completed' : 'current',
        icon: <MessageSquare size={16} />,
        notificationType: 'upload_reminder_0_15'
      });
    }

    if (dpd >= 15) {
      actions.push({
        day: 16,
        title: 'Day 16: Formal Dunning Notice',
        description: 'Send formal dunning notice',
        channels: ['Email', 'WhatsApp', 'SMS'],
        type: 'digital',
        status: isActionCompleted('formal_dunning_16') ? 'completed' : (dpd >= 15 ? 'current' : 'pending'),
        icon: <FileText size={16} />,
        notificationType: 'formal_dunning_16'
      });
    }

    if (dpd >= 16) {
      actions.push({
        day: 17,
        title: 'Days 17-30: Daily Dunning Notice',
        description: 'Send daily dunning reminders',
        channels: ['SMS', 'WhatsApp', 'Email'],
        type: 'digital',
        status: isActionCompleted('daily_dunning_17_30') ? 'completed' : (dpd >= 16 ? 'current' : 'pending'),
        icon: <Send size={16} />,
        notificationType: 'daily_dunning_17_30'
      });
    }

    // DPD 30-60
    if (dpd >= 30) {
      actions.push({
        day: 30,
        title: 'Days 30-35: Daily Notice + Voice Bot',
        description: 'Daily reminders with automated voice bot calls',
        channels: ['Voice Bot', 'SMS', 'WhatsApp'],
        type: 'digital',
        status: isActionCompleted('voice_bot_30_35') ? 'completed' : (dpd >= 30 ? 'current' : 'pending'),
        icon: <Phone size={16} />,
        notificationType: 'voice_bot_30_35'
      });
    }

    if (dpd >= 35) {
      actions.push({
        day: 36,
        title: 'Day 36: Formal LDN Notice',
        description: 'Send Formal Legal Demand Notice',
        channels: ['Email', 'WhatsApp', 'SMS'],
        type: 'digital',
        status: isActionCompleted('formal_ldn_36') ? 'completed' : (dpd >= 35 ? 'current' : 'pending'),
        icon: <FileText size={16} />,
        notificationType: 'formal_ldn_36'
      });
    }

    if (dpd >= 36) {
      actions.push({
        day: 37,
        title: 'Days 37-60: Daily LDN Reminder',
        description: 'Daily reminders for Legal Demand Notice',
        channels: ['SMS', 'WhatsApp', 'Email'],
        type: 'digital',
        status: isActionCompleted('daily_ldn_37_60') ? 'completed' : (dpd >= 36 ? 'current' : 'pending'),
        icon: <Mail size={16} />,
        notificationType: 'daily_ldn_37_60'
      });
    }

    // DPD 60-90
    if (dpd >= 60) {
      actions.push({
        day: 61,
        title: 'Days 61-65: Critical Reminder',
        description: 'High-priority critical reminder',
        channels: ['SMS', 'WhatsApp', 'Email', 'Voice Bot'],
        type: 'digital',
        status: isActionCompleted('critical_61_65') ? 'completed' : (dpd >= 60 ? 'current' : 'pending'),
        icon: <AlertCircle size={16} />,
        notificationType: 'critical_61_65'
      });
    }

    if (dpd >= 65) {
      actions.push({
        day: 66,
        title: 'Day 66: Formal LRN Notice',
        description: 'Legal Recovery Notice (Digital + Physical)',
        channels: ['Speed Post', 'Email', 'WhatsApp', 'SMS'],
        type: 'both',
        status: isActionCompleted('formal_lrn_66') ? 'completed' : (dpd >= 65 ? 'current' : 'pending'),
        icon: <Truck size={16} />,
        notificationType: 'formal_lrn_66'
      });
    }

    if (dpd >= 66) {
      actions.push({
        day: 67,
        title: 'Days 67-90: LRN Daily Reminder',
        description: 'Daily follow-ups on LRN',
        channels: ['SMS', 'WhatsApp', 'Email'],
        type: 'digital',
        status: isActionCompleted('lrn_daily_67_90') ? 'completed' : (dpd >= 66 ? 'current' : 'pending'),
        icon: <Scale size={16} />,
        notificationType: 'lrn_daily_67_90'
      });
    }

    return actions;
  };

  const actions = getActions();

  const handleSend = async (type: string) => {
    setSending(type);
    try {
      await onSendNotification(type);
    } catch (error) {
      console.error("Failed to send notification", error);
    } finally {
      setSending(null);
    }
  };

  const getStatusColor = (status: string) => {
    if (isPaid) return 'text-gray-400';

    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'current':
        return 'text-blue-600';
      case 'pending':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    if (isPaid) return 'bg-gray-100';

    switch (status) {
      case 'completed':
        return 'bg-green-100';
      case 'current':
        return 'bg-blue-100';
      case 'pending':
        return 'bg-gray-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    if (isPaid) return <CheckCircle2 size={20} className="text-green-600" />;

    switch (status) {
      case 'completed':
        return <CheckCircle2 size={20} className="text-green-600" />;
      case 'current':
        return <Clock size={20} className="text-blue-600 animate-pulse" />;
      case 'pending':
        return <Clock size={20} className="text-gray-400" />;
      default:
        return <Clock size={20} className="text-gray-400" />;
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Action Timeline</h3>

      {isPaid && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 text-green-900 dark:text-green-300 font-medium">
            <CheckCircle2 size={18} />
            Collection Cycle Stopped - Payment Received
          </div>
        </div>
      )}

      <div className="space-y-4">
        {actions.map((action, index) => (
          <div key={index} className="relative">
            {index < actions.length - 1 && (
              <div
                className={`absolute left-5 top-12 bottom-0 w-0.5 ${isPaid ? 'bg-gray-200' :
                  action.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                  }`}
              />
            )}

            <div
              className={`border dark:border-gray-800 rounded-lg p-4 ${isPaid ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30' :
                action.status === 'current'
                   ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                  : action.status === 'completed'
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${getStatusBg(action.status)} ${getStatusColor(action.status)}`}>
                  {action.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className={`font-semibold ${isPaid ? 'text-gray-500' : 'text-gray-900'}`}>
                      {action.title}
                    </h4>
                    {getStatusIcon(action.status)}
                  </div>

                  <p className={`text-sm mb-2 ${isPaid ? 'text-gray-400' : 'text-gray-600'}`}>
                    {action.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {action.channels.map((channel, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 text-xs rounded ${isPaid ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' :
                          action.status === 'current'
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : action.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                      >
                        {channel}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded font-medium ${isPaid ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' :
                        action.type === 'both'
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                          : action.type === 'physical'
                            ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        }`}>
                        {action.type === 'both' ? 'Physical + Digital' :
                          action.type === 'physical' ? 'Physical Notice' : 'Digital Notice'}
                      </span>

                      {action.type === 'physical' || action.type === 'both' ? (
                        <span className={`text-xs ${isPaid ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
                          📮 via India Post Speed Post
                        </span>
                      ) : null}
                    </div>

                    {/* SEND BUTTON */}
                    {!isPaid && action.status === 'current' && (
                      <button
                        onClick={() => handleSend(action.notificationType)}
                        disabled={sending === action.notificationType}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                      >
                        {sending === action.notificationType ? 'Sending...' : 'Send Now'}
                        <Send size={12} />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
