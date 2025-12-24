import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import {
  Language as LanguageIcon,
  KeyboardArrowDown,
  Check,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { languages, getCurrentLanguage, changeLanguage } from '../i18n';

const LanguageSelector: React.FC = () => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const currentLanguage = getCurrentLanguage();
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      handleClose();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<LanguageIcon />}
        endIcon={<KeyboardArrowDown />}
        onClick={handleClick}
        sx={{
          minWidth: '150px',
          justifyContent: 'space-between',
          textTransform: 'none',
          color: 'white',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '&:hover': {
            borderColor: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography component="span" fontSize="1.2em">
            {currentLanguage.flag}
          </Typography>
          <Typography variant="body2">
            {currentLanguage.nativeName}
          </Typography>
        </Box>
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            minWidth: '150px',
          },
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={language.code === currentLanguage.code}
            sx={{
              justifyContent: 'space-between',
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <ListItemIcon sx={{ minWidth: 'auto', marginRight: 1 }}>
                <Typography component="span" fontSize="1.2em">
                  {language.flag}
                </Typography>
              </ListItemIcon>
              <ListItemText 
                primary={language.nativeName}
                secondary={language.name}
              />
            </Box>
            {language.code === currentLanguage.code && (
              <Check fontSize="small" color="primary" />
            )}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSelector;
