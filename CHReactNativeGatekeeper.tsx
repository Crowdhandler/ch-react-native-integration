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
const API_REDIRECT_ENDPOINT = "https://api-dev.crowdhandler.com/v1/redirect/requests/";

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
  timeout: number;
  requestType: string;

  constructor(config: { CH_KEY: string }, events: CHEvents, timeout: number, debug: boolean) {
    this.CH_KEY = config.CH_KEY;
    this.debug = debug || false;
    this.timeout = timeout || 3000; // default timeout setting of 3 seconds
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
  redirectOrWait(config: { slug: string, url: string }) {
    if (!config.slug && !config.url) {

      this.on({
        type: 'onRedirect',
        payload: {
          screen_config: config,
          navigation: this.events.navigation,
          status: 200
        },
      });


    } else {

      this.requestType = 'slug';
      if (config.url) {
        this.requestType = 'url';
      }

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

  async fetchWithTimeout (resource: string, options: RequestInit) {
    
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeout);
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal  
      });      
      clearTimeout(id);
      
      return response;
    } catch (error) {
      return error;
    }

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

    return this.fetchWithTimeout(url, config)
      .then(async (response) => {        

        if(response.headers) {
          return {
            headers: response.headers,
            status: response.status,
            url: response.url,
          } as CHResponse;
        } else {
          return {
            headers: undefined,
            status: 504,
            url: undefined,
          } as CHResponse;
        }

      })
  }

  /**
   * 
   */
  async makeCrowdHandlerRequest() {
    this.on({ type: 'onRequestStart' })
    let URL: string = `${API_REDIRECT_ENDPOINT}?ch-public-key=${this.CH_KEY}`;

    if(this.requestType === 'slug') {
      URL = `${URL}&slug=${this.screen_config.slug}`;
      if (this.tokens[this.screen_config.slug]) {
        URL = `${API_REDIRECT_ENDPOINT}${this.tokens[this.screen_config.slug]}?ch-public-key=${this.CH_KEY}&slug=${this.screen_config.slug}`;
      }
    } else {
      URL = `${URL}&url=${this.screen_config.url}`;
      if (this.tokens[this.screen_config.url]) {
        URL = `${API_REDIRECT_ENDPOINT}${this.tokens[this.screen_config.url]}?ch-public-key=${this.CH_KEY}&url=${this.screen_config.url}`;
      }
    }    

    try {
      const response = await this.request<CHResponse>(URL, {
        method: 'GET'
      });      

      let token: any;
      if(response && response.url) {
        token = this.getToken(response.url);
      }

      if (token) {
        this.saveToken((this.requestType === 'slug') ? this.screen_config.slug : encodeURI(this.screen_config.url), token);
      }      

      if (response && response.status === 200) {

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

    try {
      let payload = JSON.parse(parts[1]);
  
      switch (parts[0]) {
        case 'saveToken':
  
          if (this.requestType === 'slug') {
            this.saveToken(payload.slug, payload.token)
          }
  
          if (this.requestType === 'url') {
            this.saveToken(encodeURI(payload.requestURL), payload.token)
          }
          
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
      
    } catch (error) {
      console.log(error);
      
    }
  }
}
