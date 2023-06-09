import React, { createContext, useContext } from 'react'
import CHReactNativeGatekeeper from './CHReactNativeGatekeeper';


const CrowdHandlerContext = createContext(null)

export const CrowdHandlerProvider = ({apiKey, chEvents, children, timeout, debug=false}) => {
  const CH_CONFIG = { CH_KEY : apiKey }
  const gatekeeper = new CHReactNativeGatekeeper(CH_CONFIG, chEvents, timeout, debug);
  return <CrowdHandlerContext.Provider value={gatekeeper}>{children}</CrowdHandlerContext.Provider>
}
 
export const useCrowdHandler = () => {
  return useContext(CrowdHandlerContext)
}
 