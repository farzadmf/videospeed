import { Options } from '@/options/types';

export type CheckVideoProps = {
  added: boolean;
  addNode: (node: Node) => void;
  node: Node;
  options: Options;
  parent: Node | ParentNode;
  removeNode: (node: Node) => void;
  observeNode: (node: Node) => void;
};

export type CheckVideo = (props: CheckVideoProps) => void;

export const checkVideo: CheckVideo = ({ added, addNode, node, observeNode, options, parent, removeNode }: CheckVideoProps) => {
  const element = node as Element;

  if (node.nodeName === 'VIDEO' || (node.nodeName === 'AUDIO' && options.audioBoolean)) {
    console.log('🪚 found video', node);

    if (added) {
      addNode(node);
    } else if (!document.body?.contains(node)) {
      removeNode(node);
    }
  } else {
    let children: Element[] = [];
    if (element.shadowRoot) {
      observeNode(element.shadowRoot);
      children = Array.from(element.shadowRoot.children);
    }
    if (element.children) {
      children = [...children, ...element.children];
    }
    for (const child of children) {
      checkVideo({
        added,
        addNode,
        node: child,
        observeNode,
        options,
        parent: child.parentNode || parent,
        removeNode,
      });
    }
  }
};
