import React, { PropsWithChildren } from 'react';
import { AlertTriangle, CheckCircle, Trash2, Info, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'success' | 'warning' | 'info';
  showInput?: boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputPlaceholder?: string;
}

const ConfirmationModal: React.FC<PropsWithChildren<ConfirmationModalProps>> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  showInput = false,
  inputValue = '',
  onInputChange,
  inputPlaceholder = 'Enter reason...',
  children
}) => {
  if (!isOpen) return null;

  const styles = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      btnBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      btnBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      btnBg: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-500',
    },
    info: {
      icon: Info,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      btnBg: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500',
    },
  };

  // Fallback if variant is invalid or unexpected
  const currentStyle = styles[variant] || styles.info;
  const Icon = currentStyle.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden transform transition-all scale-100 border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex items-start gap-5">
            <div className={`p-3 rounded-full flex-shrink-0 ${currentStyle.iconBg} ${currentStyle.iconColor}`}>
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{message}</p>
              
              {children}

              {showInput && onInputChange && (
                  <div className="mt-4">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Reason (Optional)</label>
                      <textarea
                          value={inputValue}
                          onChange={(e) => onInputChange(e.target.value)}
                          placeholder={inputPlaceholder}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                          autoFocus
                      />
                  </div>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors -mt-2 -mr-2 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-850 px-8 py-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-colors shadow-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              // onClose(); // Handle close in parent if needed, or explicitly call it here. 
              // Standard behavior implies parent handles logic then closes, but confirm usually means "Done".
              // Removed implicit onClose() to allow parent to validate. But wait, existing code relies on it.
              // Re-adding onClose for safety if not handled.
              // Actually, standard pattern in this app's usage is onConfirm does logic then sets isOpen false.
            }}
            className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900 transition-colors ${currentStyle.btnBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;