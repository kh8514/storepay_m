/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useCallback, useRef} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';

function App(): React.JSX.Element {
  const webviewRef = useRef<WebView>(null);

  // 웹뷰에서 메시지 받기
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    console.log('Message from WebView:', message);
  }, []);
  /*
  const handleLoadStart = (event: WebViewNavigation) => {
    console.log('Loading started:', event.url);
  };

  const handleLoadEnd = (event: WebViewNavigation) => {
    console.log('Loading finished:', event.url);
  };

  const handleError = (syntheticEvent: any) => {
    const {nativeEvent} = syntheticEvent;
    console.warn('WebView error:', nativeEvent);
  };
*/
  return (
    <SafeAreaView style={styles.container}>
      <WebView
        style={styles.webview}
        ref={webviewRef}
        source={{uri: 'http://172.30.1.13:8091'}}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        // 텍스트 입력 관련 추가 속성
        keyboardDisplayRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // iOS에서 텍스트 입력 처리 개선
        originWhitelist={['*']}
        // 텍스트 입력 관련 추가 설정
        autoManageStatusBarEnabled={false}
        bounces={false}
        scrollEnabled={true}
        // iOS 특화 설정
        allowsBackForwardNavigationGestures={true}
        // 로딩 시작 이벤트
        onLoadStart={syntheticEvent => {
          const {nativeEvent} = syntheticEvent;
          console.log('Loading started', nativeEvent.url);
        }}
        // 로딩 완료 이벤트
        onLoad={syntheticEvent => {
          const {nativeEvent} = syntheticEvent;
          console.log('Loaded', nativeEvent.url);
        }}
        // 에러 이벤트
        onError={syntheticEvent => {
          const {nativeEvent} = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        onMessage={handleMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default App;
