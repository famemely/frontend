declare module 'react-native-maps' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export const Marker: ComponentType<any>;
  const MapView: ComponentType<any & ViewProps>;
  export default MapView;
}
