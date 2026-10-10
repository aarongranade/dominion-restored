using Microsoft.AspNetCore.Components.WebView;
using Microsoft.JSInterop;

namespace DominionRestored;

public partial class MainPage : ContentPage
{
    bool _confirmingQuit;

    public MainPage()
    {
        InitializeComponent();
    }

    /// <summary>Posts a command ("pause", "resume", "mute", "unmute") to the game running in the iframe.</summary>
    public void SendToGame(string command)
    {
        _ = blazorWebView.TryDispatchAsync(sp =>
        {
            var js = sp.GetRequiredService<IJSRuntime>();
            _ = js.InvokeVoidAsync("drGame.send", command);
        });
    }

    void OnWebViewInitializing(object? sender, BlazorWebViewInitializingEventArgs e)
    {
#if IOS || MACCATALYST
        // let WebAudio and media play inline without extra gestures
        e.Configuration.AllowsInlineMediaPlayback = true;
        e.Configuration.MediaTypesRequiringUserActionForPlayback = WebKit.WKAudiovisualMediaTypes.None;
#endif
    }

    void OnWebViewInitialized(object? sender, BlazorWebViewInitializedEventArgs e)
    {
#if ANDROID
        var settings = e.WebView.Settings;
        settings.MediaPlaybackRequiresUserGesture = false;
        settings.SetSupportZoom(false);
        settings.BuiltInZoomControls = false;
        settings.DisplayZoomControls = false;
        e.WebView.OverScrollMode = Android.Views.OverScrollMode.Never;
        e.WebView.HapticFeedbackEnabled = false;
        e.WebView.LongClickable = false;
        e.WebView.SetOnLongClickListener(new NoLongClick());
#elif IOS || MACCATALYST
        e.WebView.ScrollView.ScrollEnabled = false;
        e.WebView.ScrollView.Bounces = false;
        e.WebView.ScrollView.ContentInsetAdjustmentBehavior = UIKit.UIScrollViewContentInsetAdjustmentBehavior.Never;
        e.WebView.Opaque = false;
        e.WebView.BackgroundColor = UIKit.UIColor.FromRGB(0x0B, 0x0B, 0x14);
#elif WINDOWS
        // WebView2: no zooming and no browser right-click menu over the game
        var settings = e.WebView.CoreWebView2.Settings;
        settings.IsZoomControlEnabled = false;
        settings.IsPinchZoomEnabled = false;
        settings.AreDefaultContextMenusEnabled = false;
#if !DEBUG
        settings.AreBrowserAcceleratorKeysEnabled = false; // no Ctrl+R / F5 reloading mid-game (kept in Debug for F12 tools)
#endif
#endif
    }

    // Android back button: pause the game and ask before quitting
    protected override bool OnBackButtonPressed()
    {
        if (_confirmingQuit) return true;
        _confirmingQuit = true;
        SendToGame("pause");
        Dispatcher.Dispatch(async () =>
        {
            bool quit = await DisplayAlertAsync("Quit Dominion Restored?", "Your progress is saved whenever you change screens or win a treasure.", "Quit", "Keep playing");
            _confirmingQuit = false;
            if (quit) Application.Current?.Quit();
        });
        return true;
    }

#if ANDROID
    sealed class NoLongClick : Java.Lang.Object, Android.Views.View.IOnLongClickListener
    {
        public bool OnLongClick(Android.Views.View? v) => true;
    }
#endif
}
