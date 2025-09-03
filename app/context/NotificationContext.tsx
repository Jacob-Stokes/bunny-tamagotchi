'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import OutfitGenerationQueue, { OutfitGenerationJob } from '../lib/outfitQueue';
import { useBunny } from './BunnyContext';

export interface Notification {
  id: string;
  type: 'outfit_complete' | 'outfit_failed' | 'outfit_started';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  outfitJobs: OutfitGenerationJob[];
  queueOutfitGeneration: (outfit_name: string, selected_items: any[]) => string;
  acknowledgeOutfitCompletion: (jobId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [outfitJobs, setOutfitJobs] = useState<OutfitGenerationJob[]>([]);
  const { state } = useBunny();

  const queue = OutfitGenerationQueue.getInstance();

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = queue.subscribe((jobs) => {
      setOutfitJobs(jobs);
      
      // Check for newly completed jobs and create notifications
      const completedJobs = jobs.filter(job => 
        job.status === 'completed' && 
        !notifications.find(n => n.data?.jobId === job.id)
      );
      
      const failedJobs = jobs.filter(job => 
        job.status === 'failed' && 
        !notifications.find(n => n.data?.jobId === job.id)
      );

      // Add notifications for completed jobs
      completedJobs.forEach(job => {
        addNotification({
          type: 'outfit_complete',
          title: 'Outfit Ready!',
          message: `Your "${job.outfit_name}" outfit has been generated successfully.`,
          data: { jobId: job.id, outfitName: job.outfit_name }
        });
      });

      // Add notifications for failed jobs
      failedJobs.forEach(job => {
        addNotification({
          type: 'outfit_failed',
          title: 'Outfit Generation Failed',
          message: `Failed to generate "${job.outfit_name}": ${job.error_message}`,
          data: { jobId: job.id, outfitName: job.outfit_name }
        });
      });
    });

    return unsubscribe;
  }, [notifications]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    // For now, we'll just remove the notification when marked as read
    removeNotification(id);
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const queueOutfitGeneration = (outfit_name: string, selected_items: any[]): string => {
    if (!state) {
      throw new Error('No bunny state available');
    }
    
    return queue.addJob(state.id, outfit_name, selected_items);
  };

  const acknowledgeOutfitCompletion = async (jobId: string) => {
    // Remove the notification
    setNotifications(prev => prev.filter(n => n.data?.jobId !== jobId));
    
    // Remove from queue (this triggers outfit assignment)
    await queue.acknowledgeJob(jobId);
  };

  const unreadCount = notifications.length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      removeNotification,
      markAsRead,
      clearAll,
      outfitJobs,
      queueOutfitGeneration,
      acknowledgeOutfitCompletion
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}