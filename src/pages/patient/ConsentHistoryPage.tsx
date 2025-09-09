import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getMyAccessPermissions } from '../../services/api';
import type { AccessPermission } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui';

const ConsentHistoryPage: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [permissions, setPermissions] = useState<AccessPermission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!user) return;

            try {
                setIsLoading(true);
                const data = await getMyAccessPermissions();
                setPermissions(data);
            } catch (error) {
                console.error(error);
                addToast('Failed to fetch access permissions', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPermissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100">Consent & Access History</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Access Permissions</CardTitle>
                    <CardDescription>
                        This shows which hospitals you have granted access to your records and when.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-300">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Hospital ID</th>
                                    <th scope="col" className="px-6 py-3">Access Status</th>
                                    <th scope="col" className="px-6 py-3">Granted Date</th>
                                    <th scope="col" className="px-6 py-3">Expires</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={4} className="text-center p-8">Loading permissions...</td></tr>
                                ) : permissions.length > 0 ? (
                                    permissions.map((permission) => (
                                        <motion.tr
                                            key={permission.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-white dark:bg-slate-900 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{permission.hospital_id}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    permission.granted 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                                                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                                }`}>
                                                    {permission.granted ? 'Active' : 'Revoked'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{new Date(permission.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                {permission.expires_at ? new Date(permission.expires_at).toLocaleDateString() : 'No expiry'}
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={4} className="text-center p-8">No access permissions found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default ConsentHistoryPage;
