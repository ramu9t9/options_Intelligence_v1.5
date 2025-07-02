import * as Tooltip from '@radix-ui/react-tooltip';

interface TooltipProviderProps {
  children: React.ReactNode;
}

export function TooltipProviderComponent({ children }: TooltipProviderProps) {
  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={100}>
      {children}
    </Tooltip.Provider>
  );
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function TooltipWrapper({ content, children, side = 'top', align = 'center' }: TooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content 
          side={side} 
          align={align}
          className="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={4}
        >
          {content}
          <Tooltip.Arrow className="fill-border" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}