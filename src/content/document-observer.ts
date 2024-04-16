import { AudioVideoNode, Options } from '@/options/types';
import { getShadow } from '@/shared';

import { CheckVideoProps, checkVideo } from './check-video';

export const OBSERVE_OPTIONS = {
  attributeFilter: ['aria-hidden', 'data-focus-method'],
  childList: true,
  subtree: true,
};

export type DocShadowRootObserverProps = {
  addNode: (node: AudioVideoNode) => void;
  initializeWhenReady: (doc: Document) => void;
  nodes: Set<Node>;
  observeNode: (node: Node) => void;
  options: Options;
  removeNode: (node: AudioVideoNode) => void;
};

export const docShadowRootMutationCallback =
  ({ addNode, initializeWhenReady, nodes, observeNode, options, removeNode }: DocShadowRootObserverProps): MutationCallback =>
  (mutations) => {
    // Process the DOM nodes lazily
    requestIdleCallback(
      () => {
        mutations.forEach(function (mutation) {
          const element = mutation.target as Element;

          const commonProps: Partial<CheckVideoProps> = {
            addNode,
            observeNode,
            options,
            removeNode,
          };

          switch (mutation.type) {
            case 'childList':
              mutation.addedNodes.forEach((node) => {
                if (typeof node === 'function') return;

                if (node === document.documentElement) {
                  // This happens on sites that use document.write, e.g. watch.sling.com
                  // When the document gets replaced, we lose all event handlers, so we need to reinitialize
                  initializeWhenReady(document);
                  return;
                }

                const target = node.parentNode || mutation.target;

                checkVideo({
                  ...commonProps,
                  added: true,
                  parent: target,
                  node,
                } as CheckVideoProps);
              });
              mutation.removedNodes.forEach((node) => {
                if (typeof node === 'function') return;

                const target = node.parentNode || mutation.target;
                checkVideo({
                  ...commonProps,
                  added: false,
                  parent: target,
                  node,
                } as CheckVideoProps);
              });
              break;
            case 'attributes':
              if (
                (element.getAttribute('aria-hidden') && element.getAttribute('aria-hidden') == 'false') ||
                mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER'
              ) {
                const flattenedNodes = getShadow(document.body);
                const videoTagNodes = flattenedNodes.filter((x) => x.tagName == 'VIDEO');
                for (const node of videoTagNodes) {
                  // only add vsc the first time for the apple-tv case (the attribute change is triggered every time you click the vsc)
                  // if (node.vsc && mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER') continue;
                  if (nodes.has(node) && mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER') continue;
                  // if (node.vsc) node.vsc.remove();
                  removeNode(node);

                  const target = node.parentNode || mutation.target;
                  checkVideo({
                    ...commonProps,
                    added: false,
                    parent: target,
                    node,
                  } as CheckVideoProps);
                }
              }
              break;
            default:
              break;
          }
        });
      },
      { timeout: 1000 },
    );
  };
