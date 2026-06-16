import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface Props {
  onFinish: () => void;
}

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  html,body{margin:0;padding:0;height:100%;display:flex;align-items:center;justify-content:center;background:#121111;font-family:system-ui,sans-serif;overflow:hidden;user-select:none;}
  .wrap{display:flex;flex-direction:column;align-items:center;gap:20px;}
  .caption{font-size:15px;color:#E8C449;font-weight:600;letter-spacing:1px;opacity:0.9;}
</style>
</head>
<body>
<div class="wrap">
<svg id="logo" width="240" height="240" viewBox="0 0 260 260" role="img" aria-label="Supply Setu animated logo">
  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#185FA5"/>
      <stop offset="50%" stop-color="#534AB7"/>
      <stop offset="100%" stop-color="#0F6E56"/>
    </linearGradient>
    <linearGradient id="smileGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FAC775"/>
      <stop offset="33%" stop-color="#5DCAA5"/>
      <stop offset="66%" stop-color="#5BA8F0"/>
      <stop offset="100%" stop-color="#F0997B"/>
    </linearGradient>
    <path id="topArc" d="M56 132 A76 76 0 0 1 204 132"/>
  </defs>
  <circle cx="130" cy="130" r="94" fill="url(#ring)"/>
  <circle cx="130" cy="130" r="80" fill="none" stroke="#fff" stroke-width="2" opacity="0.35"/>
  <text id="nameText" font-family="system-ui, sans-serif" font-size="21" font-weight="600" fill="#fff" letter-spacing="2">
    <textPath href="#topArc" startOffset="50%" text-anchor="middle">SUPPLY SETU</textPath>
  </text>
  <g id="eyeL" opacity="0">
    <path d="M100 124 a12 12 0 1 1 0.1 0 Z M100 124 L100 150" fill="#FAC775"/>
    <circle cx="100" cy="124" r="5" fill="#185FA5"/>
  </g>
  <g id="eyeR" opacity="0">
    <path d="M160 124 a12 12 0 1 1 0.1 0 Z M160 124 L160 150" fill="#5DCAA5"/>
    <circle cx="160" cy="124" r="5" fill="#185FA5"/>
  </g>
  <path id="smile" d="M92 160 Q130 196 168 160" fill="none" stroke="url(#smileGrad)" stroke-width="6.5" stroke-linecap="round"/>
  <g id="truck" opacity="0">
    <rect x="-10" y="-7" width="20" height="13" rx="2" fill="#fff"/>
    <path d="M10 -4 H18 L22 1 V6 H10 Z" fill="#FAC775"/>
    <circle cx="-5" cy="7" r="3.4" fill="#185FA5"/>
    <circle cx="17" cy="7" r="3.4" fill="#185FA5"/>
  </g>
</svg>
<div class="caption">SUPPLY SETU</div>
</div>
<script>
(function(){
  var truck=document.getElementById('truck'),smile=document.getElementById('smile'),
      eyeL=document.getElementById('eyeL'),eyeR=document.getElementById('eyeR'),
      len=smile.getTotalLength();
  smile.setAttribute('stroke-dasharray',len);
  function run(){
    smile.setAttribute('stroke-dashoffset',len);truck.style.opacity=1;
    eyeL.style.opacity=0;eyeR.style.opacity=0;
    var dur=2000,start=performance.now();
    function frame(now){
      var t=(now-start)/dur;if(t>1)t=1;
      var e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      var p=smile.getPointAtLength(e*len),
          p2=smile.getPointAtLength(Math.min(len,e*len+1)),
          a=Math.atan2(p2.y-p.y,p2.x-p.x)*180/Math.PI;
      truck.setAttribute('transform','translate('+p.x+','+(p.y-9)+') rotate('+a+')');
      smile.setAttribute('stroke-dashoffset',len*(1-e));
      if(e>=0.15)eyeL.style.opacity=1;
      if(e>=0.85)eyeR.style.opacity=1;
      if(t<1)requestAnimationFrame(frame);else setTimeout(run,600);
    }
    requestAnimationFrame(frame);
  }
  run();
})();
</script>
</body>
</html>
`;

const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webViewContainer}>
        <WebView
          source={{ html: htmlContent }}
          style={styles.webView}
          containerStyle={styles.webViewBg}
          originWhitelist={['*']}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
  },
  webViewContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#121111',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webViewBg: {
    backgroundColor: '#121111',
  },
});

export default SplashScreen;
