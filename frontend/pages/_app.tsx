import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import { AlertToast } from '../components/AlertToast';
import Layout from '../components/Layout';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <AlertToast />
    </ChakraProvider>
  );
}

export default MyApp; 