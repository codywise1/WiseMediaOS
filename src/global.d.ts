/// <reference types="vite/client" />

// TypeScript declaration for the <whereby-embed> Web Component
// https://docs.whereby.com/embedded/web-component
declare namespace JSX {
  interface IntrinsicElements {
    'whereby-embed': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        /** Full Whereby room URL (required) */
        room?: string;
        /** Display name shown to other participants */
        'display-name'?: string;
        /** 'on' | 'off' — initial audio state */
        audio?: string;
        /** 'on' | 'off' — initial video state */
        video?: string;
        /** 'on' | 'off' — enable screen sharing button */
        screenshare?: string;
        /** 'on' | 'off' — show in-room chat */
        chat?: string;
        /** 'on' | 'off' — show virtual background option */
        background?: string;
        /** Remove all non-essential UI chrome */
        minimal?: string;
        /** 'on' | 'off' — show people panel */
        people?: string;
        /** 'on' | 'off' — show leave button */
        'leave-button'?: string;
        /** 'on' | 'off' — show logo */
        logo?: string;
        /** 'on' | 'off' — show room name */
        'room-name'?: string;
        /** Title for the iframe */
        title?: string;
      },
      HTMLElement
    >;
  }
}
