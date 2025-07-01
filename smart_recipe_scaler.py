import math
from typing import List, Dict, Any
from ai_parsing_engine import query_ai_parser
from allergies import check_recipe_for_allergies
from ingredients import normalize_ingredient, parse_ingredient_line


def scale_recipe(recipe_data: dict, target_servings: float) -> dict:
    """
    Scale a recipe to a user-defined number of servings.
    Uses AI to intelligently recompose quantities respecting indivisible ingredients (e.g. eggs)
    and common measurement units (e.g. round to 1/8 tsp).

    No overshoot logic is applied.
    """
    if "serves" not in recipe_data or not isinstance(recipe_data["serves"], (int, float)):
        raise ValueError("Recipe is missing valid 'serves' field.")

    original_servings = recipe_data["serves"]
    scale_factor = target_servings / original_servings

    ai_prompt = {
        "instruction": "Scale this recipe from {} to {} servings. Respect indivisible items like eggs, and round to nearest usable kitchen units like 1/8 tsp. Maintain logical portion ratios within 8% tolerance.".format(original_servings, target_servings),
        "recipe": recipe_data
    }

    scaled_recipe = query_ai_parser(ai_prompt, mode="scaling")
    scaled_recipe["scaled_servings"] = target_servings
    scaled_recipe["scaling_method"] = "manual"
    scaled_recipe["scaling_notes"] = f"User scaled from {original_servings} to {target_servings} servings."

    return scaled_recipe


def scale_menu(event_file: dict, recipes: List[dict]) -> Dict[str, dict]:
    """
    Scale a list of recipes based on event guest count, staff count, and allergen exclusions.
    Adds 10% overshoot, then rounds up to next whole person. Uses smart AI scaling logic.
    """
    guest_count = event_file.get("guest_count", 0)
    staff_count = event_file.get("staff_count", 0)
    excluded_allergens = event_file.get("allergens", [])

    total_people = guest_count + staff_count
    scaled_recipes = {}

    for recipe in recipes:
        allergy_conflict = check_recipe_for_allergies(recipe, excluded_allergens)
        if allergy_conflict:
            adjusted_people = total_people - allergy_conflict
            allergy_warning = f"{allergy_conflict} people excluded due to allergen conflict"
        else:
            adjusted_people = total_people
            allergy_warning = None

        overshoot_people = math.ceil(adjusted_people * 1.10)
        base_serves = recipe.get("serves")

        if not base_serves or not isinstance(base_serves, (int, float)):
            raise ValueError(f"Recipe '{recipe.get('name')}' is missing valid 'serves' field.")

        # Skip scaling if original is within 8%
        if abs(overshoot_people - base_serves) / base_serves <= 0.08:
            scaled_recipes[recipe["id"]] = recipe
            continue

        ai_prompt = {
            "instruction": f"Scale this recipe from {base_serves} to {overshoot_people} servings. Respect indivisible items like eggs, and round to nearest usable kitchen units like 1/8 tsp.",
            "recipe": recipe
        }

        scaled = query_ai_parser(ai_prompt, mode="scaling")
        scaled["scaled_servings"] = overshoot_people
        scaled["scaling_method"] = "event_menu"
        scaled["scaling_notes"] = f"Scaled from {base_serves} to {overshoot_people} based on event size with 10% overshoot."
        if allergy_warning:
            scaled["scaling_warning"] = allergy_warning

        scaled_recipes[recipe["id"]] = scaled

    return scaled_recipes
