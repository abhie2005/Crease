import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import DateTimePickerRN, {
  DateTimePickerEvent
} from '@react-native-community/datetimepicker';

interface DateTimePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange
}) => {
  const [show, setShow] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formattedValue = value
    ? value.toLocaleString()
    : 'Select date and time';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.inputButton}
        onPress={() => setShow(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {formattedValue}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePickerRN
          value={value || new Date()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  inputButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff'
  },
  valueText: {
    fontSize: 16,
    color: '#333'
  },
  placeholderText: {
    color: '#999'
  }
});

