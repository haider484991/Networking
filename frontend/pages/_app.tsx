import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import { AlertToast } from '../components/AlertToast';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Component {...pageProps} />
      <AlertToast />
    </ChakraProvider>
  );
}

export default MyApp; 