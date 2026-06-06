import { ScrollViewStyleReset } from "expo-router/html";
import React from "react";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: 'Feather';
                src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
              }
              @font-face {
                font-family: 'Ionicons';
                src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
              }
              @font-face {
                font-family: 'MaterialIcons';
                src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
              }
              @font-face {
                font-family: 'FontAwesome';
                src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
              }
              * { box-sizing: border-box; }
              html, body { height: 100%; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
