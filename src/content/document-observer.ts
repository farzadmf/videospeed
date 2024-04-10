import { CheckFunc, CheckProps } from './check';
import { Options } from '@/options/types';
import { getShadow } from '@/shared';

export type HelloProps = {
  addNode: (node: Node) => void;
  checkFunc: CheckFunc;
  initializeWhenReady: (doc: Document) => void;
  nodes: Set<Node>;
  observeNode: (node: Node) => void;
  options: Options;
  removeNode: (node: Node) => void;
};
export const docShadowRootMutationCallback =
  ({ addNode, checkFunc, initializeWhenReady, nodes, observeNode, options, removeNode }: HelloProps): MutationCallback =>
  // ({ checkFunc }: { checkFunc: CheckFunc }): MutationCallback =>
  (mutations) => {
    // Process the DOM nodes lazily
    requestIdleCallback(
      () => {
        mutations.forEach(function (mutation) {
          const element = mutation.target as Element;

          const commonProps: Partial<CheckProps> = {
            addNode,
            checkFunc,
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

                checkFunc({
                  ...commonProps,
                  added: true,
                  parent: target,
                  node,
                } as CheckProps);
              });
              mutation.removedNodes.forEach((node) => {
                if (typeof node === 'function') return;

                const target = node.parentNode || mutation.target;
                checkFunc({
                  ...commonProps,
                  added: false,
                  parent: target,
                  node,
                } as CheckProps);
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
                  checkFunc({
                    ...commonProps,
                    added: false,
                    parent: target,
                    node,
                  } as CheckProps);
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
