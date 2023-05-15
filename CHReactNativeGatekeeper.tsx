type CHResponse = {
  status: number,
  headers: Headers,
  url: string,
  text: string
}
type CHEvents = {
  onWait: any,
  onRedirect: any,
  onRequestStart: any,
  onRequestEnd: any,
  navigation: any,
}
const API_REDIRECT_ENDPOINT = "http://api.crowdhandler.com/v1/redirect/requests/";

export default class CHReactNativeGatekeeper {

  CH_KEY: string;
  debug = false;
  tokens = {};
  events: CHEvents = {
    onWait: () => { },
    onRedirect: () => { },
    onRequestStart: () => { },
    onRequestEnd: () => { },
    navigation: null,
  };
  screen_config: any;

  constructor(config: { CH_KEY: string }, events: CHEvents, debug: boolean) {
    this.CH_KEY = config.CH_KEY;
    this.debug = debug;
    this.events = {
      ...this.events,
      ...events,
    };
  }

  /**
   * Sets the room config and starts the process of checking whether the
   * user should be shown the Waiting Room screen or directed to the screen
   * that is being protected
   * @param config 
   * @returns Promise
   */
  redirectOrWait(config: { slug: string }) {

    if (!config.slug) {

      this.on({
        type: 'onRedirect',
        payload: {
          screen_config: config,
          navigation: this.events.navigation,
          status: 200
        },
      });


    } else {

      this.screen_config = config;
      this.makeCrowdHandlerRequest();

    }
  }

  /**
   * Stores a reference to the navigation stack.
   * This is passed as an argument from the onWait and onRedirect events
   * allowing you to respond to these events
   * 
   * @param navigation
   */
  setNavigation = (navigation: any) => {
    this.events.navigation = navigation;
  }

  /**
   * 
   * @param url 
   * @param config 
   * @returns Promise
   */
  async request<CHResponse>(
    url: string,
    // `RequestInit` is a type for configuring 
    // a `fetch` request. By default, an empty object.
    config: RequestInit = {}

    // This function is async, it will return a Promise:
  ): Promise<CHResponse> {
    // Inside, we call the `fetch` function with 
    // a URL and config given:
    return fetch(url, config)
      .then(async (response) => {
        return {
          headers: response.headers,
          status: response.status,
          url: response.url,
        } as CHResponse;
      })
  }

  /**
   * 
   */
  async makeCrowdHandlerRequest() {
    this.on({ type: 'onRequestStart' })
    let URL = `${API_REDIRECT_ENDPOINT}?ch-public-key=${this.CH_KEY}&slug=${this.screen_config.slug}`;
    if (this.tokens[this.screen_config.slug]) {
      URL = `${API_REDIRECT_ENDPOINT}${this.tokens[this.screen_config.slug]}?ch-public-key=${this.CH_KEY}&slug=${this.screen_config.slug}`;
    }

    try {
      const response = await this.request<CHResponse>(URL, {
        method: 'GET'
      });

      const token = this.getToken(response.url);

      if (token) {
        this.saveToken(this.screen_config.slug, token);
      }

      if (response.status === 200) {

        this.on({
          type: 'onWait',
          payload: {
            screen_config: {
              ...this.screen_config,
              uri: response.url + `&ch_mode=react-native`,
            },
            status: response.status,
            navigation: this.events.navigation
          }
        })

      } else {

        this.on({
          type: 'onRedirect',
          payload: {
            screen_config: this.screen_config,
            navigation: this.events.navigation,
            referer: 'crowdhandler_check',
            status: response.status
          }
        });

      }

      this.on({ type: 'onRequestEnd' })

    } catch (error) {

      this.on({
        type: 'onRedirect',
        payload: {
          screen_config: this.screen_config,
          navigation: this.events.navigation,
          referer: 'crowdhandler_check',
          status: 502
        }
      });

      this.on({ type: 'onRequestEnd' })
    }

  }

  /**
   * 
   * @param action 
   */
  on(action: { type: string, payload?: object }) {

    if (this.events[action.type]) {
      this.events[action.type](action.payload);
    }
  }

  /**
   * 
   * @param url 
   * @returns 
   */
  getToken(url: string): string {

    let token = '';

    try {
      let params = url.split('?');
      if (params[1]) {
        let parts = params[1].split('&');
        // extract the token
        token = parts.reduce((token, key_value) => {

          let key = key_value.split('=');
          if (key[0] && key[0] === 'ch-id') {
            token = key[1];
          }
          return token;
        }, '');
      }

    } catch (error) {
      console.log(error);
      
    }

    return token;
  }


  saveToken(key: string, token: string) {
    this.tokens[key] = token;

  }

  handlePostMessage(message: string) {
    let parts = message.split('=');
    let payload = JSON.parse(parts[1]);

    switch (parts[0]) {
      case 'saveToken':
        this.saveToken(payload.slug, payload.token)
        break;
      case 'promoted':
        this.on({
          type: 'onRedirect',
          payload: {
            screen_config: this.screen_config,
            navigation: this.events.navigation,
            referer: 'waiting_room',
            status: 200
          }
        });
        break;

      default:
        break;
    }
  }
}
