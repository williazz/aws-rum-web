import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import FormField from '@cloudscape-design/components/form-field';
import Select from '@cloudscape-design/components/select';

interface SettingsTabProps {
    themeMode: { label: string; value: string };
    onThemeChange: (theme: { label: string; value: string }) => void;
}

export function SettingsTab({ themeMode, onThemeChange }: SettingsTabProps) {
    return (
        <div className="settings-layout">
            <Container header={<Header variant="h2">Settings</Header>}>
                <FormField label="Theme Mode">
                    <Select
                        selectedOption={themeMode}
                        onChange={({ detail }) => onThemeChange(detail.selectedOption)}
                        options={[
                            { label: 'Auto', value: 'auto' },
                            { label: 'Light', value: 'light' },
                            { label: 'Dark', value: 'dark' }
                        ]}
                    />
                </FormField>
            </Container>
        </div>
    );
}
