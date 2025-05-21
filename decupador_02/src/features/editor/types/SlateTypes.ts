
import { BaseEditor, Descendant } from 'slate';
import { ReactEditor } from 'slate-react';

export type CustomElement = { 
  type: 'paragraph'; 
  children: CustomText[] 
}

export type CustomText = { 
  text: string; 
  highlight?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: number;
}

// These are explicit DOM node types to avoid confusion with Slate Node types
export type DOMNode = globalThis.Node;
export type DOMText = globalThis.Text;
export type DOMElement = globalThis.Element;
export type DOMRange = globalThis.Range;

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
