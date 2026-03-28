import { View, Text, Pressable, type TextStyle } from 'react-native';
import { useThemeContext, themeOptions } from '../../hooks/useTheme';
import { themes, parseThemeName, type ThemeName } from '../../themes/compose';
import { variantOverrides } from '../../themes/variants';
import { size, lineHeight } from '../../themes/tokens';
import { styles } from './ThemeSwitcher.styles';

/**
 * Build preview text styles for a card using the card's own
 * theme colors + the variant's font/size overrides.
 */
function previewStyles(themeId: ThemeName) {
  const cardTheme = themes[themeId];
  const { variant } = parseThemeName(themeId);
  const def = variantOverrides[variant];

  const sizeScale = def.size ?? size;
  const lhScale = def.lineHeight ?? lineHeight;

  const label: TextStyle = {
    fontSize: sizeScale.lg,
    lineHeight: lhScale.lg,
    fontWeight: '600',
    fontFamily: def.fontFamily,
    color: cardTheme.colors.text,
  };

  const description: TextStyle = {
    fontSize: sizeScale.sm,
    lineHeight: lhScale.sm,
    fontFamily: def.fontFamily,
    color: cardTheme.colors.textSecondary,
    marginTop: 4,
  };

  return { label, description };
}

export function ThemeSwitcher() {
  const { themeName, setTheme } = useThemeContext();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick what feels right</Text>

      <View accessible accessibilityRole="radiogroup" accessibilityLabel="Theme selection">
        {themeOptions.map((option) => {
          const isSelected = themeName === option.id;
          const cardTheme = themes[option.id];
          const preview = previewStyles(option.id);

          return (
            <Pressable
              key={option.id}
              onPress={() => setTheme(option.id)}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${option.label}. ${option.description}`}
              style={[
                styles.option,
                {
                  borderColor: isSelected
                    ? cardTheme.colors.accentPurple
                    : cardTheme.colors.border,
                  backgroundColor: isSelected
                    ? cardTheme.colors.backgroundSecondary
                    : cardTheme.colors.background,
                },
                isSelected && styles.optionSelected,
              ]}
            >
              <Text style={preview.label}>{option.label}</Text>
              <Text style={preview.description}>{option.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
