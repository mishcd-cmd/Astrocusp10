// app/index.tsx
import React from 'react';
import WelcomeScreen from './settings/welcome';

export default function Index() {
  // When someone visits /, show the proper welcome + "Try the Cusp Calculator"
  return <WelcomeScreen />;
}
