
export interface Attachment {
  type: 'image' | 'pdf';
  data: string; // base64
  mimeType: string;
  name: string;
}

export interface Memory {
  id: string;
  content: string;
  timestamp: number;
  type: 'note' | 'conversation' | 'idea' | 'decision';
  concepts: string[];
  links: string[]; // IDs of other memories
  attachment?: Attachment;
  sentiment?: string;
}

export interface Node {
  id: string;
  label: string;
  type: 'memory' | 'concept';
  group: number;
}

export interface Link {
  source: string;
  target: string;
  strength: number;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

export type ViewState = 'timeline' | 'graph' | 'chat' | 'insights' | 'account';
