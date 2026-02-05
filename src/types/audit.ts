export interface AuditParams {
    reconId: string;
    action: string;
    source: string; 
    userId: string; 
    oldValue?: any;
    newValue?: any;
  }
  