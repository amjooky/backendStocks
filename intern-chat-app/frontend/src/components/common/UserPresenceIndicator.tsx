import React from 'react';
import { Badge, Tooltip } from '@mui/material';
import { Circle } from '@mui/icons-material';

interface UserPresenceIndicatorProps {
  status?: string;
  avatar?: React.ReactNode | string;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  dotSize?: number;
  children?: React.ReactNode;
}

const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
  status = 'offline',
  avatar,
  size = 'medium',
  showTooltip = true,
  dotSize,
  children,
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online': return '#4caf50';
      case 'away': return '#ff9800';
      case 'busy': return '#f44336';
      case 'offline': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const getDefaultDotSize = () => {
    if (dotSize) return dotSize;
    switch (size) {
      case 'small': return 8;
      case 'large': return 16;
      default: return 12;
    }
  };

  const getBorderSize = () => {
    switch (size) {
      case 'small': return '1px';
      case 'large': return '3px';
      default: return '2px';
    }
  };

  const statusIndicator = (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      badgeContent={
        <Circle
          sx={{
            width: getDefaultDotSize(),
            height: getDefaultDotSize(),
            color: getStatusColor(status),
            border: `${getBorderSize()} solid white`,
            borderRadius: '50%',
            backgroundColor: 'white',
          }}
        />
      }
    >
      {children || avatar}
    </Badge>
  );

  if (showTooltip) {
    return (
      <Tooltip title={getStatusLabel(status)} placement="top">
        {statusIndicator}
      </Tooltip>
    );
  }

  return statusIndicator;
};

export default UserPresenceIndicator;