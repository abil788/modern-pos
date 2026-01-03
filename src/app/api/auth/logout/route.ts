import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, storeId } = await request.json();

    if (userId && storeId) {
      // Log logout activity
      await logActivity(userId, storeId, 'OWNER_LOGOUT', 'Owner logged out');
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    );
  }
}