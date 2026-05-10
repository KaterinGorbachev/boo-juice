
MIN_NAME_LENGTH = 2
MAX_NAME_LENGTH = 150
MIN_DESCRIPTION_LENGTH = 10
MAX_DESCRIPTION_LENGTH = 500

# INGREDIENTS NAME, CANTIDAD, MEDIDA NOT NULL
# PASOS NUMERO, DESCRIPTION NOT NULL

###
# Validation helper functions
###

def is_string(value,  min_length=None, max_length=None):
    
    if not isinstance(value, str):
        return False
    not_spaces = value.strip()
    if max_length and (len(not_spaces) > max_length):
        return False
    if min_length and (len(not_spaces) < min_length):
        return False
    return True


def is_number(value):
    return isinstance(value, (int, float))

def is_integer(value, min=None, max=None):
    if not isinstance(value, (int)):
        return False    
    if max and value > max:
        return False
    if min and value < min:
        return False
    return True
    

def is_float(value, min=None, max=None):
    if not isinstance(value, (float)):
        return False    
    if max and value > max:
        return False
    if min and value < min:
        return False
    return True
    

def number_is_in_min_limit(value, min=None): 
    if min and value < min: 
        return False
    return True
    
def number_is_in_max_limit(value, max=None): 
    if max and value > max: 
        return False
    return True

def number_is_zero(value): 
    if value != 0:
        return False
    return True

def value_is_none(value): 
    if value != None: 
        return False
    return True

def validate_ingredients(ingredients):
    errors = []

    for index, ing in enumerate(ingredients):
        if not isinstance(ing, dict):
            errors.append(f"Ingredient {index} is not an object")
            continue

        if not is_string(ing.get("nombre")):
            errors.append(f"Ingredient {index}: invalid nombre")

        if not is_number(ing.get("cantidad")) or ing["cantidad"] < 0.0:
            errors.append(f"Ingredient {index}: invalid cantidad")

        if not is_string(ing.get("medida")) or (ing.get("medida") not in[
            'pieza', 'g', 'kg', 'cuchara', 'cucharadita', 'taza', 'ml', 'l', 'al gusto', 'pizca'
        ]):
            errors.append(f"Ingredient {index}: invalid medida")

    return errors


def validate_steps(steps):
    errors = []

    for index, step in enumerate(steps):
        if not isinstance(step, dict):
            errors.append(f"Step {index} is not an object")
            continue

        if not isinstance(step.get("id"), int):
            errors.append(f"Step {index}: invalid id")

        if not is_string(step.get("text")):
            errors.append(f"Step {index}: invalid text")


    return errors


if __name__ == '__main__': 
    print(is_string('brownie', 2, 150))