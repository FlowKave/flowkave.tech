'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { getAppBaseUrl } from '../../lib/supabase/config';
import { choosePendingManagerRestaurant, clearManagerSession, findManagerRestaurantChoices, setManagerSession, setPendingManagerChoices } from '../../lib/restaurant/manager-session';

type ActionState = {
  ok?: boolean;
  message?: string;
  managerChoices?: { tenantId: string; restaurantName: string; managerName: string; email: string }[];
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function authError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'مشکلی پیش آمد. دوباره امتحان کن.';
}

export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = value(formData, 'email');
  const password = value(formData, 'password');
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      await clearManagerSession();
      revalidatePath('/app/dashboard');
      redirect('/app/dashboard');
    }
  } catch (error) {
    const message = authError(error);
    if (!message.includes('NEXT_REDIRECT')) return { ok: false, message };
    throw error;
  }

  try {
    const choices = await findManagerRestaurantChoices(email, password);
    if (!choices.length) return { ok: false, message: 'ایمیل یا رمز/پین معتبر نیست.' };
    if (choices.length === 1) {
      await setManagerSession(choices[0]);
      revalidatePath('/app/dashboard');
      redirect('/app/dashboard?manager=1');
    }
    await setPendingManagerChoices(choices);
    return {
      ok: true,
      message: 'این مدیر در چند رستوران دسترسی دارد؛ رستوران مقصد را انتخاب کن.',
      managerChoices: choices.map(({ tenantId, restaurantName, managerName, email }) => ({ tenantId, restaurantName, managerName, email })),
    };
  } catch (error) {
    const message = authError(error);
    if (!message.includes('NEXT_REDIRECT')) return { ok: false, message };
    throw error;
  }
}

export async function chooseManagerRestaurantAction(formData: FormData) {
  const tenantId = value(formData, 'tenantId');
  const choice = await choosePendingManagerRestaurant(tenantId);
  if (!choice) redirect('/login?manager=expired');
  await setManagerSession(choice);
  revalidatePath('/app/dashboard');
  redirect('/app/dashboard?manager=1');
}

export async function signUpAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const email = value(formData, 'email');
    const password = value(formData, 'password');
    const fullName = value(formData, 'fullName');
    const businessName = value(formData, 'businessName');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getAppBaseUrl()}/auth/callback`,
        data: { full_name: fullName, business_name: businessName, restaurant_name: businessName }
      }
    });

    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      message: 'ثبت‌نام انجام شد. اگر تأیید ایمیل فعال باشد، لینک تأیید به ایمیلت می‌آید؛ بعد وارد شو.'
    };
  } catch (error) {
    return { ok: false, message: authError(error) };
  }
}

export async function forgotPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const email = value(formData, 'email');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppBaseUrl()}/auth/callback?next=/reset-password`
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'اگر ایمیل در سیستم باشد، لینک بازیابی رمز ارسال شد.' };
  } catch (error) {
    return { ok: false, message: authError(error) };
  }
}

export async function resetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const password = value(formData, 'password');
    const { error } = await supabase.auth.updateUser({ password });

    if (error) return { ok: false, message: error.message };
  } catch (error) {
    return { ok: false, message: authError(error) };
  }

  redirect('/login?reset=1');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearManagerSession();
  redirect('/login');
}

export async function createTenantAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) redirect('/login');

    const restaurantName = value(formData, 'restaurantName');
    const city = value(formData, 'city') || 'Test';
    const slugBase = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'test-restaurant';
    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: restaurantName, slug, owner_id: userData.user.id })
      .select('id')
      .single();

    if (tenantError) throw new Error(tenantError.message);

    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert({ tenant_id: tenant.id, user_id: userData.user.id, role: 'owner' });
    if (memberError) throw new Error(memberError.message);

    const { error: restaurantError } = await supabase
      .from('restaurants')
      .insert({ tenant_id: tenant.id, name: restaurantName, city });
    if (restaurantError) throw new Error(restaurantError.message);

    const { error: subscriptionError } = await supabase.from('subscriptions').insert({
      tenant_id: tenant.id,
      plan_code: 'restaurant_full_test',
      status: 'active',
      coupon_code: 'FLOWKAVE100',
      discount_percent: 100,
      amount_toman: 0
    });
    if (subscriptionError) throw new Error(subscriptionError.message);
  } catch (error) {
    redirect(`/app/dashboard?error=${encodeURIComponent(authError(error))}`);
  }

  revalidatePath('/app/dashboard');
  redirect('/app/dashboard');
}
