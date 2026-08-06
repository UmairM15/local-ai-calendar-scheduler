import ReactDOM from 'react-dom/client';
import CalendarSchedulerApp from '@/components/CalendarSchedulerApp';
import '@/assets/content.css';

export default defineContentScript({
  matches: ['https://calendar.google.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'ai-calendar-sidebar',
      position: 'overlay',
      anchor: 'body',
      zIndex: 2147483647,
      isolateEvents: true,

      onMount(container) {
        const app = document.createElement('div');
        container.append(app);

        const root = ReactDOM.createRoot(app);
        root.render(<CalendarSchedulerApp />);

        return root;
      },

      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});