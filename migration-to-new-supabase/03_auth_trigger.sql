-- Recreate the trigger on auth.users that auto-creates profile + user role.
-- Run AFTER 01_schema.sql (which creates handle_new_user function).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
