import { AudioVideoNode, Options } from '@/options/types';

export type CheckVideoProps = {
  added: boolean;
  addNode: (node: AudioVideoNode) => void;
  node: Node;
  options: Options;
  parent: Node | ParentNode;
  removeNode: (node: AudioVideoNode) => void;
  observeNode: (node: Node) => void;
};

export type CheckVideo = (props: CheckVideoProps) => void;

export const checkVideo: CheckVideo = ({ added, addNode, node, observeNode, options, parent, removeNode }: CheckVideoProps) => {
  const element = node as Element;

  if (node.nodeName === 'VIDEO' || (node.nodeName === 'AUDIO' && options.audioBoolean)) {
    if (added) {
      addNode(node as AudioVideoNode);
    } else if (!document.body.contains(node)) {
      removeNode(node as AudioVideoNode);
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
