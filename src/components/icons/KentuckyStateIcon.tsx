import { SvgIcon, type SvgIconProps } from '@mui/material';

/**
 * Kentucky state boundary, heavily simplified for ~24px nav (downsampled from public-domain
 * state polygon data; not for cartography).
 */
export function KentuckyStateIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" fontSize="inherit" {...props}>
      <path
        fill="currentColor"
        d="M7.72,20.55 L3.32,14.90 L1.30,10.97 L1.00,9.27 L1.97,6.86 L4.91,4.17 L6.27,3.58 L10.11,3.34 L15.82,4.35 L18.98,5.28 L20.17,6.03 L21.36,7.75 L22.52,10.46 L23.00,12.68 L22.91,13.97 L21.54,17.33 L18.92,20.66 L17.38,20.64 L16.24,20.61 L7.72,20.55 Z"
      />
    </SvgIcon>
  );
}
