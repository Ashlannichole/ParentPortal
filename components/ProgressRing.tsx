import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  textColor: string;
}

export function ProgressRing({ percent, size = 84, strokeWidth = 9, color, trackColor, textColor }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference - (circumference * clamped) / 100;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Text style={{ color: textColor, fontWeight: '700', fontSize: size * 0.22, textAlign: 'center' }}>
          {Math.round(clamped)}%
        </Text>
      </View>
    </View>
  );
}
