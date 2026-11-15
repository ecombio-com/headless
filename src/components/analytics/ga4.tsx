'use client';
import {useEffect} from 'react';
import Script from 'next/script';
import {useAnalytics} from '~/components/analytics/analytics';
import {startGa4} from '~/lib/analytics/ga4';

export function Ga4Tag({id, nonce}: {id?: string; nonce?: string}) {
  if (!id) return null;
  return (
    <>
      {/* next/script: plain <script> tags inside client components never run (React 19 warning). */}
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
gtag('js',new Date());
gtag('config','${id}',{send_page_view:false});`,
        }}
      />
      <Script
        id="ga4-gtag"
        strategy="afterInteractive"
        nonce={nonce}
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
    </>
  );
}

export function Ga4Subscriber() {
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Ga4');

  useEffect(() => {
    const stop = startGa4(subscribe as any);
    ready();
    return stop;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
