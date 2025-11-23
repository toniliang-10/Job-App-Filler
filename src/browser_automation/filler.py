"""
Form field filler for filling detected fields.
"""

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout
from typing import List
import time
from difflib import SequenceMatcher

from .detector import FormField, FieldType


class FormFieldFiller:
    """Fills form fields with generated answers."""
    
    def __init__(self, page: Page, slow_mo: int = 500):
        """
        Initialize filler.
        
        Args:
            page: Playwright page object
            slow_mo: Delay between actions in milliseconds
        """
        self.page = page
        self.slow_mo = slow_mo / 1000.0  # Convert to seconds
    
    def fill_field(self, field: FormField, value: str) -> bool:
        """
        Fill a single field with the given value.
        
        Args:
            field: FormField object
            value: Value to fill
            
        Returns:
            True if successful
        """
        try:
            # Add human-like delay
            if self.slow_mo > 0:
                time.sleep(self.slow_mo)
            
            # Fill based on field type
            if field.field_type == FieldType.TEXT or field.field_type == FieldType.EMAIL or field.field_type == FieldType.PHONE:
                return self._fill_text_field(field, value)
            
            elif field.field_type == FieldType.TEXTAREA:
                return self._fill_textarea(field, value)
            
            elif field.field_type == FieldType.SELECT:
                return self._fill_select(field, value)
            
            elif field.field_type == FieldType.RADIO:
                return self._fill_radio(field, value)
            
            elif field.field_type == FieldType.CHECKBOX:
                return self._fill_checkbox(field, value)
            
            elif field.field_type == FieldType.DATE:
                return self._fill_date_field(field, value)
            
            elif field.field_type == FieldType.NUMBER:
                return self._fill_number_field(field, value)
            
            else:
                print(f"Unknown field type: {field.field_type}")
                return False
                
        except Exception as e:
            print(f"Error filling field '{field.label}': {e}")
            return False
    
    def _fill_text_field(self, field: FormField, value: str) -> bool:
        """Fill text input field."""
        try:
            # Clear existing value
            field.element.fill('')
            
            # Type new value (human-like)
            field.element.type(value, delay=50)
            
            return True
        except Exception as e:
            print(f"Error filling text field: {e}")
            return False
    
    def _fill_textarea(self, field: FormField, value: str) -> bool:
        """Fill textarea field."""
        try:
            # Clear existing value
            field.element.fill('')
            
            # Type new value
            field.element.type(value, delay=30)
            
            return True
        except Exception as e:
            print(f"Error filling textarea: {e}")
            return False
    
    def _fill_select(self, field: FormField, value: str) -> bool:
        """Fill select dropdown."""
        try:
            # Try exact match first
            try:
                field.element.select_option(label=value)
                return True
            except:
                pass
            
            # Try fuzzy matching if exact match fails
            if field.options:
                best_match = self._find_best_match(value, field.options)
                if best_match:
                    try:
                        field.element.select_option(label=best_match)
                        print(f"  Used fuzzy match: '{value}' → '{best_match}'")
                        return True
                    except:
                        pass
            
            # Try selecting by value attribute
            try:
                field.element.select_option(value=value)
                return True
            except:
                pass
            
            print(f"Could not find matching option for: {value}")
            return False
            
        except Exception as e:
            print(f"Error filling select: {e}")
            return False
    
    def _fill_radio(self, field: FormField, value: str) -> bool:
        """Fill radio button group."""
        try:
            # Get all radios in the group
            name = field.name
            radios = self.page.query_selector_all(f'input[type="radio"][name="{name}"]')
            
            # Try exact match
            for radio in radios:
                radio_label = self._get_radio_label(radio)
                if radio_label.lower() == value.lower():
                    radio.check()
                    return True
            
            # Try fuzzy match
            if field.options:
                best_match = self._find_best_match(value, field.options)
                if best_match:
                    for radio in radios:
                        radio_label = self._get_radio_label(radio)
                        if radio_label == best_match:
                            radio.check()
                            print(f"  Used fuzzy match: '{value}' → '{best_match}'")
                            return True
            
            # Try "Yes" for yes/no questions
            if value.lower() in ['yes', 'true']:
                for radio in radios:
                    radio_label = self._get_radio_label(radio)
                    if 'yes' in radio_label.lower():
                        radio.check()
                        return True
            
            print(f"Could not find matching radio option for: {value}")
            return False
            
        except Exception as e:
            print(f"Error filling radio: {e}")
            return False
    
    def _fill_checkbox(self, field: FormField, value: str) -> bool:
        """Fill checkbox."""
        try:
            # Determine if should be checked
            should_check = value.lower() in ['yes', 'true', '1', 'checked']
            
            # Check or uncheck
            if should_check:
                field.element.check()
            else:
                field.element.uncheck()
            
            return True
        except Exception as e:
            print(f"Error filling checkbox: {e}")
            return False
    
    def _fill_date_field(self, field: FormField, value: str) -> bool:
        """Fill date field."""
        try:
            field.element.fill(value)
            return True
        except Exception as e:
            print(f"Error filling date field: {e}")
            return False
    
    def _fill_number_field(self, field: FormField, value: str) -> bool:
        """Fill number field."""
        try:
            # Extract just the number
            import re
            number_match = re.search(r'\d+', value)
            if number_match:
                number = number_match.group()
                field.element.fill(number)
                return True
            else:
                field.element.fill(value)
                return True
        except Exception as e:
            print(f"Error filling number field: {e}")
            return False
    
    def _get_radio_label(self, radio_element) -> str:
        """Get label text for a radio button."""
        try:
            # Try getting label by for attribute
            elem_id = radio_element.get_attribute('id')
            if elem_id:
                try:
                    label = self.page.query_selector(f'label[for="{elem_id}"]')
                    if label:
                        return label.inner_text().strip()
                except:
                    pass
            
            # Try parent label
            try:
                parent_tag = radio_element.evaluate('el => el.parentElement.tagName').lower()
                if parent_tag == 'label':
                    return radio_element.evaluate('el => el.parentElement.innerText').strip()
            except:
                pass
            
            # Try value attribute
            value = radio_element.get_attribute('value')
            if value:
                return value
            
        except:
            pass
        
        return ""
    
    def _find_best_match(self, target: str, options: List[str]) -> str:
        """Find best fuzzy match from options."""
        if not options:
            return ""
        
        best_match = ""
        best_ratio = 0.0
        
        target_lower = target.lower()
        
        for option in options:
            option_lower = option.lower()
            
            # Check for substring match
            if target_lower in option_lower or option_lower in target_lower:
                ratio = 0.9
            else:
                # Use sequence matcher
                ratio = SequenceMatcher(None, target_lower, option_lower).ratio()
            
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = option
        
        # Only return if confidence is high enough
        if best_ratio >= 0.6:
            return best_match
        
        return ""
    
    def scroll_to_field(self, field: FormField):
        """Scroll field into view."""
        try:
            field.element.scroll_into_view_if_needed()
            time.sleep(0.2)
        except:
            pass
    
    def highlight_field(self, field: FormField):
        """Highlight field for debugging."""
        try:
            field.element.evaluate('''
                element => {
                    element.style.border = '3px solid red';
                    setTimeout(() => {
                        element.style.border = '';
                    }, 1000);
                }
            ''')
        except:
            pass

