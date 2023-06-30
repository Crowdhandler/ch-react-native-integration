import React, { useRef, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCrowdHandler } from './CrowdHandlerProvider';
import {
   
    StyleSheet,
    StatusBar,
   
} from 'react-native';

export const CHWebView = ({ navigation, route }) => {

    const appState = useRef(AppState.currentState);
    const [appStateVisible, setAppStateVisible] = useState(appState.current);
    const isMounted = useRef(true);
    const uri = route.params.uri;
    const crowdhandler_gatekeeper = useCrowdHandler();
    const ref = useRef();
    /**
     * Only load the webview when this screen is mounted
     */
    useEffect(() => {
        const webViewMounted = () => {
            isMounted.current = true;
        };
        webViewMounted();

        return () => {
            isMounted.current = false;
        };

    }, []);


    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            appState.current = nextAppState;
            setAppStateVisible(appState.current);
        });
        return () => {
            subscription.remove();
        };
    }, []);

    return (
        (appStateVisible == 'active' && isMounted.current) ?
        <WebView style={styles.container}
            ref={(instance) => (ref.current = instance)}
            onMessage={(event) => {
                crowdhandler_gatekeeper.handlePostMessage(event.nativeEvent.data);
            }}
            source={{ uri }}
        />
        :
        null
    );


}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
        alignItems: 'center',
        marginTop: StatusBar.currentHeight || 0,
        backgroundColor: '#1B182E',
    },
    button: {
        alignItems: 'center',
        alignSelf: 'stretch',
        // backgroundColor: '#1B182E',
        borderBottomColor: '#fff',
        borderBottomWidth: 1,
        paddingRight: 16,
        marginBottom: 0
    },
    buttonText : {
      textAlign: 'center',  
      fontSize: 16,
      color: '#fff',
      fontWeight: 700
    },
    title: {
        fontSize: 16,
    },
    productImage: {
        width: 100,
        height: 100,
        marginRight: 20,
        borderRadius: 0
    },
});

