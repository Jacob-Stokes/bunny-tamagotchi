export interface OutfitGenerationJob {
  id: string;
  bunny_id: string;
  outfit_name: string;
  selected_items: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
  error_message?: string;
  generated_image_url?: string;
}

class OutfitGenerationQueue {
  private static instance: OutfitGenerationQueue;
  private jobs: Map<string, OutfitGenerationJob> = new Map();
  private processing = false;
  private listeners: ((jobs: OutfitGenerationJob[]) => void)[] = [];

  static getInstance(): OutfitGenerationQueue {
    if (!OutfitGenerationQueue.instance) {
      OutfitGenerationQueue.instance = new OutfitGenerationQueue();
    }
    return OutfitGenerationQueue.instance;
  }

  // Add a job to the queue
  addJob(bunny_id: string, outfit_name: string, selected_items: any[]): string {
    const id = `outfit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: OutfitGenerationJob = {
      id,
      bunny_id,
      outfit_name,
      selected_items,
      status: 'pending',
      created_at: new Date()
    };
    
    this.jobs.set(id, job);
    this.notifyListeners();
    
    // Start processing if not already processing
    if (!this.processing) {
      this.processQueue();
    }
    
    return id;
  }

  // Get all jobs
  getJobs(): OutfitGenerationJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      b.created_at.getTime() - a.created_at.getTime()
    );
  }

  // Get jobs for a specific bunny
  getJobsForBunny(bunny_id: string): OutfitGenerationJob[] {
    return this.getJobs().filter(job => job.bunny_id === bunny_id);
  }

  // Get pending/processing jobs
  getActiveJobs(): OutfitGenerationJob[] {
    return this.getJobs().filter(job => 
      job.status === 'pending' || job.status === 'processing'
    );
  }

  // Get completed jobs that haven't been acknowledged
  getCompletedJobs(): OutfitGenerationJob[] {
    return this.getJobs().filter(job => job.status === 'completed');
  }

  // Get a specific job
  getJob(id: string): OutfitGenerationJob | undefined {
    return this.jobs.get(id);
  }

  // Remove/acknowledge a completed job and assign the outfit
  async acknowledgeJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'completed') {
      console.warn(`Cannot acknowledge job ${id} - not found or not completed`);
      return;
    }
    
    try {
      // Apply the outfit to the bunny and wait for completion
      await this.assignOutfitToBunny(job);
      
      // Use the pre-generated image instead of regenerating
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('bunny-outfit-applied', { 
          detail: { 
            imageUrl: job.generated_image_url,
            jobId: id,
            fromOutfitAcceptance: true
          } 
        }));
      }, 100);
      
    } catch (error) {
      console.error(`❌ Failed to assign outfit to bunny:`, error);
    }
    
    // Remove from queue regardless of success/failure
    this.jobs.delete(id);
    this.notifyListeners();
  }

  // Assign outfit to bunny (equip all items)
  private async assignOutfitToBunny(job: OutfitGenerationJob): Promise<void> {
    const { InventoryService } = await import('./inventoryService');
    
    
    // First, unequip all current items
    const currentInventory = await InventoryService.getBunnyFullInventory(job.bunny_id);
    const currentSlots = Object.keys(currentInventory.equipment || {});
    
    for (const slot of currentSlots) {
      await InventoryService.unequipSlot(job.bunny_id, slot as any);
    }
    
    // Then equip all items from the generated outfit
    for (const item of job.selected_items) {
      await InventoryService.equipItem(job.bunny_id, item.item_id);
    }
    
    // Verify the equipment was applied correctly
    const verifyInventory = await InventoryService.getBunnyFullInventory(job.bunny_id);
    const newEquipment = Object.keys(verifyInventory.equipment || {});
  }

  // Subscribe to queue changes
  subscribe(callback: (jobs: OutfitGenerationJob[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(): void {
    const jobs = this.getJobs();
    this.listeners.forEach(callback => callback(jobs));
  }

  // Process the queue
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    while (true) {
      // Find next pending job
      const pendingJob = this.getJobs().find(job => job.status === 'pending');
      if (!pendingJob) break;
      
      // Mark as processing
      pendingJob.status = 'processing';
      this.notifyListeners();
      
      try {
        const startTime = Date.now();
        
        // Call the generation API
        const response = await fetch('/api/save-outfit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bunny_id: pendingJob.bunny_id,
            outfit_name: pendingJob.outfit_name,
            selected_items: pendingJob.selected_items
          }),
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
          // Add realistic delay to prevent instant notifications
          // Real image generation should take at least a few seconds
          const minGenerationTime = 3000; // 3 seconds minimum
          const actualDelay = Math.max(0, minGenerationTime - (Date.now() - startTime));
          
          if (actualDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, actualDelay));
          }
          
          // Success
          pendingJob.status = 'completed';
          pendingJob.completed_at = new Date();
          pendingJob.generated_image_url = result.bunny_image_url;
        } else {
          // Failure
          pendingJob.status = 'failed';
          pendingJob.completed_at = new Date();
          pendingJob.error_message = result.error || 'Generation failed';
        }
        
      } catch (error) {
        // Error
        pendingJob.status = 'failed';
        pendingJob.completed_at = new Date();
        pendingJob.error_message = error instanceof Error ? error.message : 'Unknown error';
      }
      
      this.notifyListeners();
      
      // Small delay between jobs to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.processing = false;
  }
}

export default OutfitGenerationQueue;