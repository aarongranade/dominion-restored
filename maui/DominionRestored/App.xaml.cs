namespace DominionRestored;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var page = new MainPage();
        var window = new Window(page) { Title = "Dominion Restored" };
        // the game pauses itself on visibilitychange too; this covers WebViews that do not fire it
        window.Deactivated += (_, _) => page.SendToGame("pause");
        window.Stopped += (_, _) => page.SendToGame("pause");
        window.Resumed += (_, _) => { DeviceDisplay.Current.KeepScreenOn = true; page.SendToGame("resume"); };
        window.Created += (_, _) => DeviceDisplay.Current.KeepScreenOn = true;
        return window;
    }
}
