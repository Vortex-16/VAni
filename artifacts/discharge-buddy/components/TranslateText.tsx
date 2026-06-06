import React, { useState, useEffect } from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useApp } from '@/context/AppContext';
import { translateText } from '@/utils/translate';

export function TranslateText(props: TextProps) {
  const { language } = useApp();
  const [translatedContent, setTranslatedContent] = useState<React.ReactNode>(props.children);

  useEffect(() => {
    let isMounted = true;

    async function processChildren() {
      if (language === 'en') {
        setTranslatedContent(props.children);
        return;
      }
      
      try {
        if (typeof props.children === 'string' || typeof props.children === 'number') {
          const textToTranslate = String(props.children);
          // Skip translating very short numbers or symbols
          if (!isNaN(Number(textToTranslate)) || textToTranslate.trim().length <= 1) {
            if (isMounted) setTranslatedContent(props.children);
            return;
          }

          const translated = await translateText(textToTranslate, language);
          if (isMounted) setTranslatedContent(translated);
        } else if (Array.isArray(props.children)) {
          const newChildren = await Promise.all(props.children.map(async (child) => {
            if (child === null || child === undefined) return child;
            if (typeof child === 'string' || typeof child === 'number') {
              const textToTranslate = String(child);
              if (!isNaN(Number(textToTranslate)) || textToTranslate.trim().length <= 1) return child;
              return await translateText(textToTranslate, language);
            }
            return child;
          }));
          if (isMounted) setTranslatedContent(newChildren);
        } else {
          // If it's another React component or object, we can't easily translate it here
          if (isMounted) setTranslatedContent(props.children);
        }
      } catch (e) {
        console.warn("Translation failed for", props.children, e);
        if (isMounted) setTranslatedContent(props.children);
      }
    }
    
    processChildren();

    return () => {
      isMounted = false;
    };
  }, [props.children, language]);

  return <RNText {...props}>{translatedContent}</RNText>;
}
