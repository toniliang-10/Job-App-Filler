"""
Form field detection and classification using Playwright.
"""

from playwright.sync_api import Page, ElementHandle
from typing import List, Dict, Optional
import re


class FieldType:
    """Field type constants."""
    TEXT = "text"
    TEXTAREA = "textarea"
    SELECT = "select"
    RADIO = "radio"
    CHECKBOX = "checkbox"
    DATE = "date"
    NUMBER = "number"
    EMAIL = "email"
    PHONE = "phone"
    FILE = "file"
    UNKNOWN = "unknown"


class FormField:
    """Represents a detected form field."""
    
    def __init__(
        self,
        element: ElementHandle,
        field_type: str,
        label: str,
        name: str,
        placeholder: str = "",
        required: bool = False,
        options: Optional[List[str]] = None
    ):
        self.element = element
        self.field_type = field_type
        self.label = label
        self.name = name
        self.placeholder = placeholder
        self.required = required
        self.options = options or []
        self.value = ""  # Will be filled by answer generator
    
    def __repr__(self):
        return f"FormField(type={self.field_type}, label='{self.label}', required={self.required})"


class FormFieldDetector:
    """Detects and classifies form fields on a page."""
    
    def __init__(self, page: Page):
        """
        Initialize detector with a Playwright page.
        
        Args:
            page: Playwright page object
        """
        self.page = page
    
    def detect_all_fields(self) -> List[FormField]:
        """
        Detect all form fields on the current page.
        
        Returns:
            List of FormField objects
        """
        fields = []
        
        # Detect input fields
        input_fields = self._detect_input_fields()
        fields.extend(input_fields)
        
        # Detect textareas
        textarea_fields = self._detect_textareas()
        fields.extend(textarea_fields)
        
        # Detect select dropdowns
        select_fields = self._detect_selects()
        fields.extend(select_fields)
        
        # Detect radio buttons
        radio_fields = self._detect_radios()
        fields.extend(radio_fields)
        
        # Detect checkboxes
        checkbox_fields = self._detect_checkboxes()
        fields.extend(checkbox_fields)
        
        print(f"✓ Detected {len(fields)} form fields")
        
        return fields
    
    def _detect_input_fields(self) -> List[FormField]:
        """Detect input fields."""
        fields = []
        
        # Get all input elements
        inputs = self.page.query_selector_all('input:not([type="hidden"]):not([type="submit"]):not([type="button"])')
        
        for input_elem in inputs:
            try:
                input_type = input_elem.get_attribute('type') or 'text'
                
                # Skip already handled types
                if input_type in ['radio', 'checkbox', 'file']:
                    continue
                
                # Classify field type
                field_type = self._classify_input_type(input_type, input_elem)
                
                # Extract label
                label = self._extract_label(input_elem)
                
                # Extract other attributes
                name = input_elem.get_attribute('name') or input_elem.get_attribute('id') or ''
                placeholder = input_elem.get_attribute('placeholder') or ''
                required = input_elem.get_attribute('required') is not None
                
                if label or name or placeholder:  # Only add if we have some identifying info
                    fields.append(FormField(
                        element=input_elem,
                        field_type=field_type,
                        label=label,
                        name=name,
                        placeholder=placeholder,
                        required=required
                    ))
            except Exception as e:
                print(f"Error detecting input field: {e}")
                continue
        
        return fields
    
    def _detect_textareas(self) -> List[FormField]:
        """Detect textarea fields."""
        fields = []
        
        textareas = self.page.query_selector_all('textarea')
        
        for textarea in textareas:
            try:
                label = self._extract_label(textarea)
                name = textarea.get_attribute('name') or textarea.get_attribute('id') or ''
                placeholder = textarea.get_attribute('placeholder') or ''
                required = textarea.get_attribute('required') is not None
                
                fields.append(FormField(
                    element=textarea,
                    field_type=FieldType.TEXTAREA,
                    label=label,
                    name=name,
                    placeholder=placeholder,
                    required=required
                ))
            except Exception as e:
                print(f"Error detecting textarea: {e}")
                continue
        
        return fields
    
    def _detect_selects(self) -> List[FormField]:
        """Detect select dropdown fields."""
        fields = []
        
        selects = self.page.query_selector_all('select')
        
        for select in selects:
            try:
                label = self._extract_label(select)
                name = select.get_attribute('name') or select.get_attribute('id') or ''
                required = select.get_attribute('required') is not None
                
                # Extract options
                options = []
                option_elements = select.query_selector_all('option')
                for opt in option_elements:
                    opt_text = opt.inner_text().strip()
                    if opt_text and opt_text.lower() not in ['select', 'choose', 'please select', '--']:
                        options.append(opt_text)
                
                fields.append(FormField(
                    element=select,
                    field_type=FieldType.SELECT,
                    label=label,
                    name=name,
                    required=required,
                    options=options
                ))
            except Exception as e:
                print(f"Error detecting select: {e}")
                continue
        
        return fields
    
    def _detect_radios(self) -> List[FormField]:
        """Detect radio button groups."""
        fields = []
        processed_names = set()
        
        radios = self.page.query_selector_all('input[type="radio"]')
        
        for radio in radios:
            try:
                name = radio.get_attribute('name')
                
                # Skip if we've already processed this radio group
                if not name or name in processed_names:
                    continue
                
                processed_names.add(name)
                
                # Get all radios in this group
                group_radios = self.page.query_selector_all(f'input[type="radio"][name="{name}"]')
                
                # Extract options
                options = []
                for r in group_radios:
                    opt_label = self._extract_label(r, include_nearby=True)
                    if opt_label:
                        options.append(opt_label)
                
                # Get group label
                label = self._extract_label(radio, include_nearby=False)
                if not label:
                    # Try to find a common parent with a label
                    label = self._find_group_label(radio)
                
                fields.append(FormField(
                    element=radio,  # Store first radio as representative
                    field_type=FieldType.RADIO,
                    label=label or name,
                    name=name,
                    required=False,
                    options=options
                ))
            except Exception as e:
                print(f"Error detecting radio: {e}")
                continue
        
        return fields
    
    def _detect_checkboxes(self) -> List[FormField]:
        """Detect checkbox fields."""
        fields = []
        
        checkboxes = self.page.query_selector_all('input[type="checkbox"]')
        
        for checkbox in checkboxes:
            try:
                label = self._extract_label(checkbox, include_nearby=True)
                name = checkbox.get_attribute('name') or checkbox.get_attribute('id') or ''
                required = checkbox.get_attribute('required') is not None
                
                fields.append(FormField(
                    element=checkbox,
                    field_type=FieldType.CHECKBOX,
                    label=label,
                    name=name,
                    required=required
                ))
            except Exception as e:
                print(f"Error detecting checkbox: {e}")
                continue
        
        return fields
    
    def _classify_input_type(self, input_type: str, element: ElementHandle) -> str:
        """Classify input field type."""
        # Direct type mapping
        type_map = {
            'email': FieldType.EMAIL,
            'tel': FieldType.PHONE,
            'phone': FieldType.PHONE,
            'date': FieldType.DATE,
            'number': FieldType.NUMBER,
            'text': FieldType.TEXT,
        }
        
        if input_type in type_map:
            return type_map[input_type]
        
        # Try to infer from name/id/placeholder
        name = (element.get_attribute('name') or '').lower()
        elem_id = (element.get_attribute('id') or '').lower()
        placeholder = (element.get_attribute('placeholder') or '').lower()
        
        combined = f"{name} {elem_id} {placeholder}"
        
        if any(term in combined for term in ['email', 'e-mail']):
            return FieldType.EMAIL
        if any(term in combined for term in ['phone', 'tel', 'mobile', 'contact']):
            return FieldType.PHONE
        if any(term in combined for term in ['date', 'dob', 'birthday']):
            return FieldType.DATE
        if any(term in combined for term in ['number', 'years', 'salary', 'age']):
            return FieldType.NUMBER
        
        return FieldType.TEXT
    
    def _extract_label(self, element: ElementHandle, include_nearby: bool = True) -> str:
        """Extract label text for an element."""
        try:
            # Method 1: Associated label element
            elem_id = element.get_attribute('id')
            if elem_id:
                try:
                    label_elem = self.page.query_selector(f'label[for="{elem_id}"]')
                    if label_elem:
                        return label_elem.inner_text().strip()
                except:
                    pass
            
            # Method 2: Parent label
            try:
                parent = element.evaluate('el => el.parentElement')
                if parent:
                    parent_elem = element.evaluate('el => el.parentElement.tagName')
                    if parent_elem and parent_elem.lower() == 'label':
                        return element.evaluate('el => el.parentElement.innerText').strip()
            except:
                pass
            
            # Method 3: aria-label
            aria_label = element.get_attribute('aria-label')
            if aria_label:
                return aria_label.strip()
            
            # Method 4: placeholder
            if include_nearby:
                placeholder = element.get_attribute('placeholder')
                if placeholder:
                    return placeholder.strip()
            
            # Method 5: name attribute (cleaned up)
            name = element.get_attribute('name')
            if name:
                # Convert camelCase or snake_case to readable text
                readable = re.sub(r'[_-]', ' ', name)
                readable = re.sub(r'([a-z])([A-Z])', r'\1 \2', readable)
                return readable.strip().title()
            
        except Exception as e:
            print(f"Error extracting label: {e}")
        
        return ""
    
    def _find_group_label(self, element: ElementHandle) -> str:
        """Find label for a group of fields (like radio buttons)."""
        try:
            # Look for nearby heading or legend elements
            legend = element.evaluate('''
                el => {
                    let parent = el.closest('fieldset');
                    if (parent) {
                        let legend = parent.querySelector('legend');
                        if (legend) return legend.innerText;
                    }
                    return '';
                }
            ''')
            if legend:
                return legend.strip()
        except:
            pass
        
        return ""

