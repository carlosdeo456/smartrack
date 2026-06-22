import React, { useState, useCallback, useEffect } from 'react';
import { Toast } from '../ui';

const NOTIFICATION_POSITIONS = {
  TOP_RIGHT: 'top-right',
  TOP_CENTER: 'top-center',
  TOP_LEFT: 'top-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_CENTER: 'bottom-center',
  BOTTOM_LEFT: 'bottom-left',
};

const POSITION_CLASSES = {
  'top-right': 'fixed top-4 right-4',
  'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2',
  'top-left': 'fixed top-4 left-4',
  'bottom-right': 'fixed bottom-4 right-4',
  'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2',
  'bottom-left': 'fixed bottom-4 left-4',
};

export const useNotification = (options = {}) => {
  const {
    position = NOTIFICATION_POSITIONS.BOTTOM_RIGHT,
    maxNotifications = 5,
    enablePersistence = false,
    persistenceKey = 'app_notifications',
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);

  // Load persisted notifications on mount
  useEffect(() => {
    if (enablePersistence) {
      try {
        const stored = localStorage.getItem(persistenceKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotifications(parsed.filter(n => n.persistent));
        }
      } catch (error) {
        console.error('Failed to load persisted notifications:', error);
      }
    }
  }, [enablePersistence, persistenceKey]);

  // Group similar notifications (same type and message)
  const groupNotifications = useCallback((notifs) => {
    const grouped = {};
    notifs.forEach(notif => {
      const key = `${notif.type}_${notif.message}`;
      if (grouped[key]) {
        grouped[key].count = (grouped[key].count || 1) + 1;
      } else {
        grouped[key] = { ...notif, count: 1 };
      }
    });
    return Object.values(grouped);
  }, []);

  const addNotification = useCallback((
    message,
    type = 'info',
    options = {}
  ) => {
    const {
      duration = 3000,
      persistent = false,
      actions = [],
      group = true,
    } = options;

    const id = Date.now() + Math.random();
    const newNotif = {
      id,
      message,
      type,
      duration,
      persistent,
      actions,
      timestamp: new Date(),
    };

    setNotifications(prev => {
      let updated = [...prev, newNotif];

      // Group similar notifications if enabled
      if (group) {
        updated = groupNotifications(updated);
      }

      // Limit max notifications
      if (updated.length > maxNotifications) {
        updated = updated.slice(-maxNotifications);
      }

      // Persist important notifications
      if (enablePersistence && persistent) {
        try {
          localStorage.setItem(persistenceKey, JSON.stringify(updated.filter(n => n.persistent)));
        } catch (error) {
          console.error('Failed to persist notifications:', error);
        }
      }

      return updated;
    });

    // Add to history
    setHistory(prev => [newNotif, ...prev].slice(0, 50));

    return id;
  }, [maxNotifications, enablePersistence, persistenceKey, groupNotifications]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const executeAction = useCallback((notificationId, actionId) => {
    const notif = notifications.find(n => n.id === notificationId);
    if (notif) {
      const action = notif.actions?.find(a => a.id === actionId);
      if (action && action.handler) {
        action.handler();
      }
      if (action?.closeAfter !== false) {
        removeNotification(notificationId);
      }
    }
  }, [notifications, removeNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const getHistory = useCallback(() => history, [history]);

  return {
    notifications,
    addNotification,
    removeNotification,
    position,
    executeAction,
    clearAll,
    history: getHistory(),
  };
};

export const NotificationCenter = ({
  notifications = [],
  onRemove = () => {},
  position = NOTIFICATION_POSITIONS.BOTTOM_RIGHT,
  onAction = () => {},
}) => {
  const containerClass = POSITION_CLASSES[position] || POSITION_CLASSES[NOTIFICATION_POSITIONS.BOTTOM_RIGHT];
  const spacingClass = position.includes('top') ? 'space-y-2' : 'space-y-2';

  return (
    <div className={`${containerClass} space-y-2 z-40 max-w-sm pointer-events-none`}>
      {notifications.map(notif => (
        <div key={notif.id} className="pointer-events-auto">
          <Toast
            message={notif.message}
            type={notif.type}
            onClose={() => onRemove(notif.id)}
            duration={notif.duration}
            actions={notif.actions}
            onAction={(actionId) => onAction(notif.id, actionId)}
            count={notif.count}
          />
        </div>
      ))}
    </div>
  );
};
