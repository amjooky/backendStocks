declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }
  
  export const Home: FC<IconProps>;
  export const Package: FC<IconProps>;
  export const TrendingUp: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  export const DollarSign: FC<IconProps>;
  export const Users: FC<IconProps>;
  export const ShoppingCart: FC<IconProps>;
  export const RefreshCw: FC<IconProps>;
  export const Bell: FC<IconProps>;
  export const Settings: FC<IconProps>;
  export const LogOut: FC<IconProps>;
  export const CheckCircle: FC<IconProps>;
  export const XCircle: FC<IconProps>;
  export const BarChart3: FC<IconProps>;
  export const Activity: FC<IconProps>;
}

declare module 'chart.js' {
  interface ChartTypeRegistry {
    pie: {
      chartOptions: any;
      datasetOptions: any;
      defaultDataPoint: number;
      metaExtensions: {};
      parsedDataType: number;
      scales: any;
    };
  }
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.less' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}
