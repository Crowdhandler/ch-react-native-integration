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
    const uri = route.params.uri;
    const crowdhandler_gatekeeper = useCrowdHandler();

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
        (appStateVisible == 'active') ?
        <WebView style={styles.container}
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
    },
});

