import type { Pagina } from '@unc/cms-types';
import { blockRegistry } from './registry';
import { BlockErrorBoundary } from '@/components/blocks/BlockErrorBoundary';

type LayoutBlock = NonNullable<Pagina['layout']>[number];

interface BlockRendererProps {
  layout?: LayoutBlock[] | null;
}

export function BlockRenderer({ layout }: BlockRendererProps) {
  if (!layout || layout.length === 0) return null;

  return (
    <>
      {layout.map((block, index) => {
        const Component = blockRegistry[block.blockType];
        const key = block.id || `${block.blockType}-${index}`;

        if (!Component) {
          if (process.env.NODE_ENV !== 'production') {
            return (
              <div
                key={key}
                className="border-2 border-dashed border-red-500 bg-red-50 p-4 text-sm text-red-700"
              >
                Bloque no reconocido: <code>{block.blockType}</code>
              </div>
            );
          }
          return null;
        }

        return (
          <BlockErrorBoundary key={key} blockType={block.blockType}>
            <Component {...block} />
          </BlockErrorBoundary>
        );
      })}
    </>
  );
}
