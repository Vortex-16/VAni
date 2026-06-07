import React from 'react';
import { Platform, View } from 'react-native';

// Try to import CSS only on web
if (Platform.OS === 'web') {
  require('./GlareHover.css');
}

interface GlareHoverProps {
  width?: string | number;
  height?: string | number;
  background?: string;
  borderRadius?: string | number;
  borderColor?: string;
  children?: React.ReactNode;
  glareColor?: string;
  glareOpacity?: number;
  glareAngle?: number;
  glareSize?: number;
  transitionDuration?: number;
  playOnce?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const GlareHoverWeb = ({
  width = '100%',
  height = '100%',
  background = 'transparent',
  borderRadius = '10px',
  borderColor = 'transparent',
  children,
  glareColor = '#ffffff',
  glareOpacity = 0.5,
  glareAngle = -45,
  glareSize = 250,
  transitionDuration = 650,
  playOnce = false,
  className = '',
  style = {}
}: GlareHoverProps) => {
  const hex = glareColor.replace('#', '');
  let rgba = glareColor;
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  } else if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  }

  const vars = {
    '--gh-width': typeof width === 'number' ? `${width}px` : width,
    '--gh-height': typeof height === 'number' ? `${height}px` : height,
    '--gh-bg': background,
    '--gh-br': typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    '--gh-angle': `${glareAngle}deg`,
    '--gh-duration': `${transitionDuration}ms`,
    '--gh-size': `${glareSize}%`,
    '--gh-rgba': rgba,
    '--gh-border': borderColor
  };

  return (
    // @ts-ignore
    <div
      className={`glare-hover ${playOnce ? 'glare-hover--play-once' : ''} ${className}`}
      style={{ ...vars, ...style } as any}
    >
      {children}
    </div>
  );
};

export const GlareHover = (props: GlareHoverProps) => {
  if (Platform.OS === 'web') {
    return <GlareHoverWeb {...props} />;
  }
  // Fallback for native where div and CSS are not supported
  return (
    <View style={{ width: props.width as any, height: props.height as any, borderRadius: props.borderRadius as any, backgroundColor: props.background, borderColor: props.borderColor, borderWidth: props.borderColor && props.borderColor !== 'transparent' ? 1 : 0, overflow: 'hidden' }}>
      {props.children}
    </View>
  );
};

export default GlareHover;
