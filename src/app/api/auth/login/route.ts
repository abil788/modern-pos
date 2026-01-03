import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerPassword } from '@/lib/auth';
import { logActivity } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { password, storeId } = await request.json();
    
    const user = await verifyOwnerPassword(password, storeId);
    
    await logActivity(user.id, storeId, 'OWNER_LOGIN', 'Owner logged in');
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}