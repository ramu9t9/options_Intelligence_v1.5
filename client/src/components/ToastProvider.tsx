import { Toaster } from 'sonner';
import { useTheme } from './ThemeProvider';

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster 
      theme={theme === 'dark' ? 'dark' : 'light'}
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: theme === 'dark' ? 'hsl(224 71% 4%)' : 'hsl(0 0% 98%)',
          border: theme === 'dark' ? '1px solid hsl(217 32% 17%)' : '1px solid hsl(214 32% 91%)',
          color: theme === 'dark' ? 'hsl(213 31% 91%)' : 'hsl(222 84% 5%)',
        },
      }}
    />
  );
}