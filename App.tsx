/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useRef, useState} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';
import CryptoJS from 'crypto-js';
import Config from 'react-native-config';

function encryptAES256(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(key), {
    iv: CryptoJS.enc.Utf8.parse(key.slice(0, 16)),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
}

function decryptAES256(encryptedData: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(
    encryptedData,
    CryptoJS.enc.Utf8.parse(key),
    {
      iv: CryptoJS.enc.Utf8.parse(key.slice(0, 16)),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  );
  return bytes.toString(CryptoJS.enc.Utf8);
}

const key = Config.REACT_APP_SECURITY_KEY;

SQLite.DEBUG(true);
SQLite.enablePromise(true);

let db: SQLiteDatabase;
const securityKey: string = process.env.REACT_APP_SECURITY_KEY || 'storepay';
console.log('securityKey :: ', securityKey);

function App(): React.JSX.Element {
  const webviewRef = useRef<WebView>(null);

  const initDB = async () => {
    try {
      db = await SQLite.openDatabase({name: 'storage.db', location: 'default'});
      console.log('Database opened');
      /*
      const query = 'DROP TABLE IF EXISTS Card;';
      await db.executeSql(query);
      */
      await db.executeSql(
        `CREATE TABLE IF NOT EXISTS Card (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT,
            card_name TEXT,
            card_no TEXT,
            card_nick_name TEXT,
            pw TEXT,
            expiry_date TEXT,
            birth_date TEXT
          );`,
      );

      console.log('Table created or already exists');

      fetchCard();
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  };

  const fetchCard = async () => {
    try {
      const [results] = await db.executeSql(`select * from Card;`);
      const fetchedUsers = [];
      for (let i = 0; i < results.rows.length; i++) {
        fetchedUsers.push(results.rows.item(i));
      }
      console.log('======= selected fetch card :: ', fetchedUsers);
    } catch (error) {
      console.error(error);
    }
  };

  // 사용자 삽입 함수
  const insertCard = async (data: any) => {
    const {params} = data;
    //console.log('암호화 카드넘버 :: ', encryptAES256(params.cardNo, key));
    try {
      const result = await db.executeSql(
        'INSERT INTO Card (id, card_name, card_no, card_nick_name, pw, expiry_date, birth_date) VALUES (?,?,?,?,?,?,?);',
        [
          params.id,
          params.cardNm,
          encryptAES256(params.cardNo, key),
          params.cardNickNm,
          encryptAES256(params.password, key),
          params.expiryDate,
          params.birthdate,
        ],
      );
      console.log('User inserted:', result);
      console.log('Success', 'User inserted successfully');
      console.log('select id :: ', params.id);
      selectCard(params.id, 'insert');
    } catch (error) {
      console.error('Failed to insert user:', error);
      sendDataToWebView({result: 'failed'});
    }
  };

  const fetchSelect = async () => {
    const [results] = await db.executeSql('SELECT * FROM Card;');
    const card = [];
    for (let i = 0; i < results.rows.length; i++) {
      let data = results.rows.item(i);
      data = {
        ...data,
        card_no: data.card_no,
        pw: data.pw,
      };
      card.push(data);
    }

    console.log('fetchSelect card :', card);
  };

  const selectCard = async (id: string, gb: string | undefined) => {
    try {
      const [results] = await db.executeSql(
        'SELECT seq, id, card_name, card_no, card_nick_name, pw, expiry_Date, birth_date  FROM Card where id=?;',
        [id],
      );
      const card = [];
      for (let i = 0; i < results.rows.length; i++) {
        let data = results.rows.item(i);
        //console.log('복호화 카드넘버 :: ', decryptAES256(data.card_no, key));
        data = {
          ...data,
          card_no: decryptAES256(data.card_no, key),
          pw: decryptAES256(data.pw, key),
        };
        card.push(data);
      }

      console.log('card :', card);

      const resultData = {
        gb: gb || 'select',
        result: 'success',
        data: card,
      };
      sendDataToWebView(resultData);
      return card;
    } catch (error) {
      console.error('Failed to fetch Users:', error);
      const resultData = {
        gb: gb || 'select',
        result: 'failed',
      };
      sendDataToWebView(resultData);
    }
  };

  const deleteCard = async (params: {seq: string; id: string}) => {
    const {id, seq} = params;
    try {
      const [result] = await db.executeSql(
        'DELETE FROM card WHERE id=? and seq=?;',
        [id, seq],
      );
      if (result.rowsAffected > 0) {
        console.log('Delete Success');
        selectCard(id, 'delete');
      } else {
        console.log(`No card found `);
        const resultData = {
          gb: 'delete',
          result: 'failed',
        };
        sendDataToWebView(resultData);
      }
    } catch (error) {
      console.log('Failed to delete card');
      const resultData = {
        gb: 'delete',
        result: 'failed',
      };
      sendDataToWebView(resultData);
    }
  };

  // WebView로 데이터 전달
  const sendDataToWebView = (data: any) => {
    console.log('sendDataToWebView :: ', data);
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        (function() {
          const newData = ${JSON.stringify(data)};
          console.log('New data received:', newData);
          if (typeof returnCardList === 'function') {
            returnCardList(${JSON.stringify(data)});
          }
          true; // 꼭있어야됨
        })();
      `);
    }
  };

  // 웹뷰에서 메시지 받기
  const handleMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    console.log('Message from WebView:', message, typeof message);

    const data = JSON.parse(message);

    switch (data.type) {
      case 'addCard':
        console.log('add :: ', data.params);
        insertCard(data);
        break;

      case 'searchCard':
        console.log('search');
        const card = selectCard(data.params, 'select');
        console.log('card :: ', card);
        break;

      case 'deleteCard':
        console.log('delete');
        deleteCard(data.params);
    }
  };

  const handleError = (syntheticEvent: any) => {
    const {nativeEvent} = syntheticEvent;
    console.warn('WebView error:', nativeEvent);
  };

  const handleLoadEnd = () => {
    selectCard('test', 'select');
  };

  // 초기화
  useEffect(() => {
    initDB();
    // 클린업: 컴포넌트 언마운트 시 데이터베이스 닫기
    return () => {
      if (db) {
        db.close()
          .then(() => console.log('Database closed'))
          .catch(error => console.error('Failed to close database:', error));
      }
    };
  }, []);

  const [statusBarStyle, setStatusBarStyle] = useState('light-content');

  const handleNavigateionStateChange = (navState: any) => {
    console.log('nav url :: ', navState.url);
    if (navState.url.includes('/login')) {
      setStatusBarStyle('white');
    } else {
      setStatusBarStyle('#4371ea');
    }
  };

  return (
    <>
      <SafeAreaView
        style={(styles.container, {backgroundColor: statusBarStyle})}
      />
      <SafeAreaView style={styles.container}>
        <WebView
          style={styles.webview}
          ref={webviewRef}
          source={{uri: 'http://172.30.1.31:8096'}}
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
          onLoadEnd={handleLoadEnd}
          // 에러 이벤트
          onError={handleError}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigateionStateChange}
        />
      </SafeAreaView>
      <SafeAreaView style={{backgroundColor: '#f2f5fb'}} />
    </>
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
