import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import { theme, cssVariablesResolver } from './theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="auto">
        <ModalsProvider>
          <Notifications />
          <AuthProvider>
            <App />
          </AuthProvider>
        </ModalsProvider>
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>
);
